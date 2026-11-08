import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { card } from "@/components/ui";
import { displayName, requireCouple } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { NameForm, UnpairButton } from "./settings-client";
import { NotificationsToggle } from "./notifications";
import { AppearancePicker } from "./appearance";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile, partner, couple } = await requireCouple();

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-4 px-4">
        <section className={card}>
          <h2 className="mb-3 font-semibold">Profile</h2>
          <NameForm userId={user.id} initialName={profile.name ?? ""} />
          <p className="mt-3 text-sm text-muted">{user.email}</p>
        </section>

        <section className={card}>
          <h2 className="font-semibold">Partner</h2>
          {partner ? (
            <p className="mt-1">
              Paired with <strong>{displayName(partner)}</strong>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Not joined yet. Invite code:{" "}
              <span className="font-mono font-semibold text-brand">{couple.invite_code}</span>
            </p>
          )}
          <UnpairButton hasPartner={!!partner} />
        </section>

        <section className={card}>
          <NotificationsToggle userId={user.id} vapidPublicKey={process.env.VAPID_PUBLIC_KEY ?? null} />
        </section>

        <section className={card}>
          <AppearancePicker />
        </section>

        <Link href="/events" className={`${card} flex items-center justify-between`}>
          <span>
            <span className="block font-semibold">Special days</span>
            <span className="block text-sm text-muted">Anniversary, birthdays, countdowns</span>
          </span>
          <span className="text-muted" aria-hidden>
            ›
          </span>
        </Link>

        <form action={signOut}>
          <button className="h-12 w-full rounded-full border border-border bg-surface font-semibold">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
