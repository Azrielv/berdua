"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorText } from "@/components/ui";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function detect(): Promise<State> {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isIOS && !standalone) return "ios-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

export function NotificationsToggle({ userId, vapidPublicKey }: { userId: string; vapidPublicKey: string | null }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    detect().then(setState, () => setState("unsupported"));
  }, []);

  async function enable() {
    if (!vapidPublicKey) return setError("Push isn't configured on the server (VAPID_PUBLIC_KEY).");
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      const { error } = await createClient()
        .from("profiles")
        .update({ push_subscription: sub.toJSON() })
        .eq("id", userId);
      if (error) throw error;
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
      await createClient().from("profiles").update({ push_subscription: null }).eq("id", userId);
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/push/test", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) setMsg("Sent! It should pop up in a few seconds.");
    else setError(body.error ?? "Couldn't send a test.");
  }

  const hint: Partial<Record<State, string>> = {
    unsupported: "This browser doesn't support push notifications.",
    "ios-install": "On iPhone: tap Share → Add to Home Screen, open Berdua from there, then turn this on.",
    denied: "Notifications are blocked. Allow them for this site in your browser or phone settings.",
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Reminders</p>
          <p className="text-sm text-muted">Day before + 2h before dates, due to-dos, special days</p>
        </div>
        {(state === "on" || state === "off") && (
          <button
            role="switch"
            aria-checked={state === "on"}
            aria-label="Push notifications"
            disabled={busy}
            onClick={state === "on" ? disable : enable}
            className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${
              state === "on" ? "bg-brand" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                state === "on" ? "left-7" : "left-1"
              }`}
            />
          </button>
        )}
      </div>
      {hint[state] && <p className="mt-2 text-sm text-muted">{hint[state]}</p>}
      {state === "on" && (
        <button onClick={test} disabled={busy} className="mt-3 text-sm font-medium text-brand disabled:opacity-50">
          Send a test notification
        </button>
      )}
      {state === "on" && (
        <p className="mt-1 text-xs text-muted">One device per person: turning this on elsewhere moves reminders there.</p>
      )}
      {msg && <p className="mt-2 text-sm text-muted">{msg}</p>}
      {error && <p className={`${errorText} mt-2`}>{error}</p>}
    </div>
  );
}
