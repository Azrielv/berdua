import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/**
 * Service-role client: bypasses RLS. SERVER ONLY — never import this from a
 * Client Component. Used by the reminder dispatcher and push test route.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
