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

/** Current user, their profile, couple and partner (deduped per request). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", user.id)
    .maybeSingle<Profile>();

  let couple: Couple | null = null;
  let partner: Profile | null = null;
  if (profile?.couple_id) {
    const [c, p] = await Promise.all([
      supabase.from("couples").select(COUPLE_COLS).eq("id", profile.couple_id).maybeSingle<Couple>(),
      supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("couple_id", profile.couple_id)
        .neq("id", user.id)
        .maybeSingle<Profile>(),
    ]);
    couple = c.data;
    partner = p.data;
  }

  return { user, profile, couple, partner };
});

/** For pages inside the app: must be signed in and have a couple. */
export async function requireCouple() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.profile || !s.couple) redirect("/pair");
  return { ...s, profile: s.profile, couple: s.couple };
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
