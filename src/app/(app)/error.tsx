"use client";

import { useEffect } from "react";
import { btn } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl" aria-hidden>
        {offline ? "📡" : "😵‍💫"}
      </p>
      <h1 className="mt-3 text-xl font-semibold">{offline ? "You're offline" : "Something went wrong"}</h1>
      <p className="mt-1 text-sm text-muted">
        {offline ? "Reconnect to load this screen." : "It's not you, it's us. Try again in a moment."}
      </p>
      <button onClick={reset} className={`${btn} mt-6 max-w-48`}>
        Try again
      </button>
    </div>
  );
}
