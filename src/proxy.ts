import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

// /api/reminders is called by pg_cron and checks its own secret.
const PUBLIC_PATHS = ["/login", "/auth", "/api/reminders"];

/** Refreshes the Supabase session cookie and gates signed-out users. */
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims;

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));

  const redirectTo = (to: string) => {
    const r = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!signedIn && !isPublic) return redirectTo("/login");
  if (signedIn && path === "/login") return redirectTo("/");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|offline.html|manifest.webmanifest).*)",
  ],
};
