import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  couple_id: string | null;
};
export type Couple = { id: string; invite_code: string; anniversary: string | null };

// Never `select *` on profiles: push_subscription is not readable by clients.
const PROFILE_COLS = "id, name, avatar_url, couple_id";
const COUPLE_COLS = "id, invite_code, anniversary";

type ProfileWithCouple = Profile & { couples: Couple | null };

/** Current user, their profile, couple and partner (deduped per request). */
export const getSession = cache(async () => {
  const supabase = await createClient();

  // getClaims verifies the JWT locally (no round trip to Supabase Auth).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const user = { id: claims.sub, email: (claims.email as string | undefined) ?? null };

  // One query: RLS returns exactly my row + my partner's row, each with the couple.
  const { data: rows } = await supabase
    .from("profiles")
    .select(`${PROFILE_COLS}, couples(${COUPLE_COLS})`)
    .returns<ProfileWithCouple[]>();

  const strip = (r: ProfileWithCouple): Profile => ({
    id: r.id,
    name: r.name,
    avatar_url: r.avatar_url,
    couple_id: r.couple_id,
  });
  const mine = rows?.find((r) => r.id === user.id) ?? null;
  const theirs = rows?.find((r) => r.id !== user.id && mine?.couple_id && r.couple_id === mine.couple_id) ?? null;

  return {
    user,
    profile: mine ? strip(mine) : null,
    couple: mine?.couples ?? null,
    partner: theirs ? strip(theirs) : null,
  };
});

/** For pages inside the app: must be signed in and have a couple. */
export async function requireCouple() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.profile || !s.couple) redirect("/pair");
  return { ...s, profile: s.profile, couple: s.couple };
}

/**
 * requireCouple() + page queries, all in parallel. RLS already limits rows to
 * the couple, so the queries don't need to wait. If the session check fails,
 * its redirect wins over any query error.
 */
export async function requireCoupleAnd<T extends readonly unknown[] | []>(tasks: T) {
  const [session, ...rest] = await Promise.allSettled([requireCouple(), ...tasks]);
  if (session.status === "rejected") throw session.reason;
  const values = rest.map((r) => {
    if (r.status === "rejected") throw r.reason;
    return r.value;
  });
  return [session.value, ...values] as unknown as [
    Awaited<ReturnType<typeof requireCouple>>,
    ...{ -readonly [P in keyof T]: Awaited<T[P]> },
  ];
}

/** { userId: name } for both partners, to show "added by" / "ticked by". */
export function memberNames(s: { profile: Profile; partner: Profile | null }) {
  const names: Record<string, string> = { [s.profile.id]: displayName(s.profile, "You") };
  if (s.partner) names[s.partner.id] = displayName(s.partner);
  return names;
}

export function displayName(p: Pick<Profile, "name"> | null | undefined, fallback = "Partner") {
  return p?.name?.trim() || fallback;
}
