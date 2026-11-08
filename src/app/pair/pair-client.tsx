"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btn, btnSecondary, card, errorText, input } from "@/components/ui";

export function PairClient({
  initialName,
  inviteCode,
}: {
  initialName: string;
  inviteCode: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // While waiting for the partner, re-check every few seconds.
  // The page redirects home as soon as they've joined.
  useEffect(() => {
    if (!inviteCode) return;
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [inviteCode, router]);

  async function saveName(userId: string) {
    const trimmed = name.trim().slice(0, 40);
    if (trimmed && trimmed !== initialName) {
      await createClient().from("profiles").update({ name: trimmed }).eq("id", userId);
    }
  }

  async function run(kind: "create" | "join") {
    setBusy(kind);
    setError(null);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) await saveName(data.user.id);

    const { error } =
      kind === "create"
        ? await supabase.rpc("create_couple")
        : await supabase.rpc("join_couple", { code });
    setBusy(null);
    if (error) return setError(error.message);
    router.refresh();
  }

  async function share() {
    if (!inviteCode) return;
    const text = `Join me on Berdua! My code is ${inviteCode} — ${window.location.origin}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Berdua invite", text });
        return;
      }
    } catch {
      return; // share sheet dismissed
    }
    await navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const nameField = (
    <label className="block">
      <span className="text-sm font-medium">What should your partner call you?</span>
      <input
        className={`${input} mt-1.5`}
        value={name}
        maxLength={40}
        autoComplete="given-name"
        placeholder="Your name"
        onChange={(e) => setName(e.target.value)}
      />
    </label>
  );

  const joinForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run("join");
      }}
      className="space-y-3"
    >
      <input
        className={`${input} text-center font-mono text-2xl uppercase tracking-[.4em]`}
        value={code}
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="ABC234"
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        aria-label="Partner's invite code"
      />
      <button className={inviteCode ? btnSecondary : btn} disabled={busy !== null || code.length !== 6}>
        {busy === "join" ? "Joining…" : "Join partner"}
      </button>
    </form>
  );

  if (inviteCode) {
    return (
      <div className="mt-8 space-y-5">
        <section className={`${card} text-center`}>
          <p className="text-sm text-muted">Your invite code</p>
          <p className="mt-2 font-mono text-4xl font-semibold tracking-[.3em] text-brand">
            {inviteCode}
          </p>
          <button className={`${btn} mt-5`} onClick={share}>
            {copied ? "Copied!" : "Share code"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Waiting for your partner to join…
          </p>
        </section>

        <Link href="/" className={btnSecondary}>
          Continue to the app for now
        </Link>

        <details className={card}>
          <summary className="cursor-pointer text-sm font-medium">
            Got your partner&apos;s code instead?
          </summary>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-muted">
              Joining their code drops yours. Anything you added on your own is removed.
            </p>
            {joinForm}
            {error && <p className={errorText}>{error}</p>}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {nameField}

      <section className={card}>
        <h2 className="font-semibold">I&apos;ll share a code</h2>
        <p className="mt-1 text-sm text-muted">Get a 6-character code to send your partner.</p>
        <button className={`${btn} mt-4`} disabled={busy !== null} onClick={() => run("create")}>
          {busy === "create" ? "Creating…" : "Create invite code"}
        </button>
      </section>

      <section className={card}>
        <h2 className="mb-1 font-semibold">I have a code</h2>
        <p className="mb-4 text-sm text-muted">Enter the code your partner shared.</p>
        {joinForm}
      </section>

      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
