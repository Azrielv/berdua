# Berdua

Couple planner PWA: shared dates with map locations, places wishlist, to-dos and budget. See `SPEC.md` for the full spec and build order.

## Run locally

```bash
cp .env.example .env.local   # fill in Supabase keys
npm install
npm run dev                  # http://localhost:3000
```

To test on your phone, use the same Wi-Fi and open `http://<your-PC-IP>:3000`.
"Use my location" in the map picker also needs HTTPS (or localhost), so it won't work over `http://<your-PC-IP>`.
The service worker only registers in production (`npm run build && npm start`), and installing the PWA on a phone needs HTTPS. Use a Vercel preview deploy or a tunnel for that.

## Supabase setup (once)

1. Create a project at supabase.com. Copy **Project URL** and **anon / publishable key** into `.env.local`.
2. **SQL Editor** → run each file in `supabase/migrations/` in order (0001, 0002, …). Realtime is switched on by the migrations.
3. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000` (change to your Vercel URL when deployed)
   - Redirect URLs: `http://localhost:3000/auth/callback`, `http://<your-PC-IP>:3000/auth/callback`, later `https://<your-app>.vercel.app/auth/callback`
4. **Authentication → Emails → Magic Link** template: add the code so people can sign in inside the installed app
   (on iPhone, email links open in Safari, not the home-screen app):
   ```html
   <p>Your code: <strong>{{ .Token }}</strong></p>
   ```
5. Optional Google: enable it under **Authentication → Providers**, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`.

Supabase's built-in email sender only allows a few emails per hour. That's fine for two people; add custom SMTP if you hit the limit.

## Push reminders (after deploying)

`.env.local` already has generated `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `CRON_SECRET`. Copy them to Vercel's env vars too.

1. Set `VAPID_SUBJECT` to `mailto:you@yourdomain.com` (or your app's https URL), and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API).
2. Supabase → Database → Extensions: enable **pg_cron** and **pg_net**.
3. Edit `supabase/cron.sql` (your Vercel URL + `CRON_SECRET`) and run it in the SQL Editor.
4. On each phone: Settings → Reminders → on → "Send a test notification".
   iPhone: Add to Home Screen first and open the app from there (iOS 16.4+).

What gets a reminder (both partners):
- Dates: the day before and 2 hours before
- To-dos with a due date: 9:00 AM on the due day (cancelled when ticked)
- Birthdays, special days and your anniversary: 9:00 AM the day before

The spec suggested a Supabase Edge Function for sending. It's a Next.js route
(`src/app/api/reminders/dispatch/route.ts`) instead, so it runs on Node,
deploys with the app and could be tested locally. Supabase still owns the schedule (pg_cron) and data.

## Deploy checklist (phase 12)

1. **Supabase**: run every file in `supabase/migrations/` in order (0001 → 0007) in the SQL Editor.
2. **GitHub**: create a *private* repo, then from this folder:
   ```bash
   git config user.name "Your Name" && git config user.email "you@example.com"   # once, if not set
   git commit -m "Berdua: couple planner PWA"
   git remote add origin https://github.com/<you>/berdua.git
   git push -u origin main
   ```
3. **Vercel**: Add New → Project → import the repo (framework auto-detected as Next.js).
   Add these Environment Variables (values from `.env.local` + Supabase → Settings → API):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`
   (optional: `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH`). Deploy.
4. **Supabase → Authentication → URL Configuration**: Site URL = `https://<your-app>.vercel.app`,
   and add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.
5. **Reminders**: enable `pg_cron` + `pg_net`, fill in `supabase/cron.sql`, run it.
6. **Phones** (both): open the Vercel URL →
   - Android/Chrome: menu → *Install app*
   - iPhone/Safari: Share → *Add to Home Screen*, then open it from the Home Screen
   Sign in (type the 6-digit code), pair, then Settings → Reminders → on → *Send a test notification*.

## Build progress

- [x] 1. Setup (Next.js + Tailwind, Supabase client, env vars, PWA manifest/icons/service worker, bottom nav)
- [x] 2. Auth + pairing (magic link / 6-digit code / optional Google, invite codes, RLS)
- [x] 3. Dates (calendar month view, add/edit/delete, realtime)
- [x] 4. Map picker (Nominatim search, tap-to-pin, use my location, mini map, Waze/Google Maps)
- [x] 5. To-dos (lists, items, due dates, who ticked it, realtime)
- [x] 6. Budget (50/50 split, all-time balance, settle up, category breakdown, date actual cost → expense)
- [x] 7. Saved places + spinner (Places map with status/type filters, plan a date here, random picker)
- [x] 8. Home + countdowns (next-date countdown, special days + anniversary, today's to-dos, events on calendar)
- [x] 9. Push reminders (Web Push; reminders scheduled by DB triggers; pg_cron → /api/reminders/dispatch)
- [x] 10. Memories (photos → private Storage bucket, rating, memory note, memory map + timeline)
- [x] 11. Polish (System/Light/Dark theme, loading skeletons, error + not-found pages, offline page cache + banner)
- [ ] 12. Deploy (see checklist above)

Icons are generated by `node scripts/gen-icons.mjs`.
