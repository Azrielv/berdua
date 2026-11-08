import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { PairClient } from "./pair-client";

export const metadata = { title: "Pair up" };

export default async function PairPage() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.couple && s.partner) redirect("/");

  return (
    <main className="mx-auto min-h-dvh max-w-md px-6 pb-10 pt-[calc(env(safe-area-inset-top)+2rem)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Pair with your partner</h1>
          <p className="mt-1 text-sm text-muted">
            One of you shares a code, the other enters it. That&apos;s it.
          </p>
        </div>
        <form action={signOut}>
          <button className="text-sm text-muted underline-offset-2 hover:underline">Sign out</button>
        </form>
      </div>
      <PairClient
        initialName={s.profile?.name ?? ""}
        inviteCode={s.couple?.invite_code ?? null}
      />
    </main>
  );
}
