import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components. */
export function createClient() {
  // Inlined at build time, so these must be referenced literally here.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
