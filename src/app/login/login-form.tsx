"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btn, btnSecondary, errorText, input } from "@/components/ui";

export function LoginForm({
  initialError,
  googleEnabled,
}: {
  initialError: string | null;
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Signed out: drop pages the service worker saved for offline use.
  useEffect(() => {
    if ("caches" in window) caches.delete("berdua-pages").catch(() => {});
  }, []);

  const callbackUrl = () => `${window.location.origin}/auth/callback`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });
    setBusy(false);
    if (error) return setError(error.message);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      return setError("That code didn't work. Check it, or request a new one.");
    }
    router.replace("/");
    router.refresh();
  }

  async function google() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) setError(error.message);
  }

  if (step === "code") {
    return (
      <form onSubmit={verifyCode} className="mt-8 space-y-3">
        <p className="text-sm">
          We emailed <strong>{email}</strong>. Tap the link, or type the code from the email here
          (best if you&apos;ve installed the app on your home screen).
        </p>
        <input
          className={`${input} text-center text-2xl tracking-[.4em]`}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6,10}"
          maxLength={10}
          placeholder="123456"
          value={token}
          onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
        />
        {error && <p className={errorText}>{error}</p>}
        <button className={btn} disabled={busy || token.length < 6}>
          {busy ? "Checking…" : "Sign in"}
        </button>
        <button
          type="button"
          className="w-full py-2 text-sm text-muted"
          onClick={() => {
            setStep("email");
            setToken("");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </form>
    );
  }

  return (
    <div className="mt-8 space-y-3">
      <form onSubmit={sendLink} className="space-y-3">
        <input
          className={input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className={errorText}>{error}</p>}
        <button className={btn} disabled={busy}>
          {busy ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 py-1 text-xs text-muted">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <button type="button" className={btnSecondary} onClick={google}>
            Continue with Google
          </button>
        </>
      )}
    </div>
  );
}
