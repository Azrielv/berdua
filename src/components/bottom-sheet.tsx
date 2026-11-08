"use client";

import { useEffect, useRef } from "react";

/** Modal panel that slides up from the bottom; tap outside or Esc to close. */
export function BottomSheet({
  title,
  onClose,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        <div className="mb-4 mt-2 flex items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="shrink-0 text-sm text-muted">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
