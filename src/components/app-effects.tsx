"use client";

import { useEffect, useState } from "react";
import { applyTheme, readThemePref } from "@/lib/theme";

/** Root-level side effects: service worker, theme sync, offline banner. */
export function AppEffects() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Service worker (production only, so dev hot-reload isn't cached).
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Theme: apply the saved choice and follow the system when set to "system".
    applyTheme(readThemePref());
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => readThemePref() === "system" && applyTheme("system");
    mq.addEventListener("change", onScheme);

    const onNet = () => setOffline(!navigator.onLine);
    onNet();
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    return () => {
      mq.removeEventListener("change", onScheme);
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
    };
  }, []);

  if (!offline) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] bg-foreground px-4 pb-1.5 pt-[calc(env(safe-area-inset-top)+0.375rem)] text-center text-xs font-medium text-background"
    >
      You&apos;re offline: showing what was saved. Changes need a connection.
    </div>
  );
}
