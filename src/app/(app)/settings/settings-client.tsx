"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { errorText, input } from "@/components/ui";

export function NameForm({ userId, initialName }: { userId: string; initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name.trim() !== saved && name.trim().length > 0;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const trimmed = name.trim().slice(0, 40);
    const { error } = await createClient().from("profiles").update({ name: trimmed }).eq("id", userId);
    setBusy(false);
    if (error) return setError(error.message);
    setSaved(trimmed);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex gap-2">
      <input
        className={input}
        value={name}
        maxLength={40}
        placeholder="Your name"
        aria-label="Your name"
        onChange={(e) => setName(e.target.value)}
      />
      {dirty && (
        <button className="h-12 shrink-0 rounded-xl bg-brand px-4 font-semibold text-white" disabled={busy}>
          Save
        </button>
      )}
      {error && <p className={errorText}>{error}</p>}
    </form>
  );
}

export function UnpairButton({ hasPartner }: { hasPartner: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unpair() {
    const msg = hasPartner
      ? "Unpair from your partner? You'll lose access to your shared plans. They keep them."
      : "Cancel your invite code? Anything you've added on your own will be deleted.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    const { error } = await createClient().rpc("leave_couple");
    setBusy(false);
    if (error) return setError(error.message);
    router.replace("/pair");
    router.refresh();
  }

  return (
    <>
      <button
        onClick={unpair}
        disabled={busy}
        className="mt-4 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
      >
        {hasPartner ? "Unpair" : "Cancel invite"}
      </button>
      {error && <p className={errorText}>{error}</p>}
    </>
  );
}
