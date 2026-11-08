# Couple Planner (Kita-style) + Map Dates — Build Spec

Give this file to Claude Code as `SPEC.md` in an empty project folder.
Build **one phase at a time**. Test each phase on your phone before moving on.

---

## 1. Stack (keep it simple)

| Part | Choice | Why |
|---|---|---|
| Frontend | **Next.js (App Router) + Tailwind** | One codebase, deploys free on Vercel |
| App feel | **PWA** (manifest + service worker) | "Add to Home Screen", works like an app |
| Backend + DB | **Supabase** (Postgres + Auth + Realtime + Storage) | Live sync between 2 phones with no server code |
| Map | **Leaflet + OpenStreetMap** tiles | Free, no API key |
| Place search | **Google Places API** (or free **Nominatim** to start) | Google has much better Malaysian shop/café data |
| Push reminders | **Web Push** (VAPID) via Supabase Edge Function + cron | Free, works on Android + iOS 16.4+ installed PWA |
| Hosting | **Vercel** | Free tier is enough |

Accounts you need: GitHub, Vercel, Supabase, (optional) Google Cloud for Places API.

---

## 2. Core features (what Kita has)

1. **Couple pairing**: user signs up, gets a 6-character invite code, and the partner joins using it. Both are linked to one `couple_id`.
2. **Shared calendar / dates**: add a date with a title, date and time, notes and a category (date night, anniversary, trip, errand).
3. **Shared to-do lists**: multiple lists, tick off items, see who ticked them.
4. **Budget**: log spending, who paid, category, monthly total, split balance ("you owe RM 42").
5. **Reminders**: push notifications before dates and tasks.
6. **Realtime sync**: a change on one phone appears instantly on the other.

---

## 3. New features (the add-ons)

### A. 📍 Pick date location from map (main request)
- Map picker on the "Add date" screen: **search a place** OR **tap the map to drop a pin**
- Save `place_name`, `address`, `lat`, `lng`, `place_id`
- Date detail page shows a mini map + buttons: **Open in Waze** / **Open in Google Maps**
  - Waze: `https://waze.com/ul?ll={lat},{lng}&navigate=yes`
  - Google: `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- "Use my location" button to centre the map

### B. ⭐ Saved places / wishlist
- Save spots you both want to try ("Want to go" / "Been there" / "Favourite")
- Show them as pins on a **Places map** tab
- One tap → "Plan a date here"

### C. 🎲 "Where should we go?" spinner
- Randomly picks from the saved "Want to go" places (filter by category, e.g. food or café)
- Ends the "you choose / no you choose" argument

### D. 🗺️ Memory map
- After a date, upload photos and a short note
- All past dates become pins on a map, and tapping one shows the photos
- Timeline view too

### E. 💕 Countdown + anniversaries
- Home screen card: "12 days to our anniversary", "3 days to next date"
- Recurring yearly events (birthdays, anniversary)

### F. 💸 Date budget link
- Each date can have an estimated cost and an actual cost
- Actual cost auto-adds to the Budget tab

### G. 🌦️ Weather on date day (optional)
- Show forecast for the date's location (Open-Meteo API, free, no key)

### H. Small extras (optional)
- Date ideas list (shared brainstorm)
- Mood/rating after each date (1–5 hearts)
- Dark mode

---

## 4. Database tables (Supabase)

```sql
profiles      (id uuid PK = auth.uid, name, avatar_url, couple_id, push_subscription jsonb)
couples       (id uuid PK, invite_code text unique, anniversary date, created_at)
dates         (id, couple_id, title, starts_at timestamptz, category, notes,
               place_name, address, lat float8, lng float8, place_id,
               est_cost numeric, actual_cost numeric, rating int,
               created_by, created_at)
date_photos   (id, date_id, storage_path, caption, created_at)
places        (id, couple_id, name, address, lat, lng, place_id,
               category, status text  -- 'want' | 'been' | 'fav'
               , notes, created_at)
todo_lists    (id, couple_id, name, created_at)
todos         (id, list_id, text, done bool, done_by, due_at, created_at)
expenses      (id, couple_id, amount numeric, category, paid_by, note,
               spent_on date, date_id nullable, created_at)
reminders     (id, couple_id, target_type, target_id, remind_at, sent bool)
events        (id, couple_id, title, event_date, recurring_yearly bool)  -- birthdays/anniversaries
```

**Row Level Security on every table:** a user can only read and write rows where `couple_id` = their own `profiles.couple_id`.
Turn on **Realtime** for: `dates`, `todos`, `expenses`, `places`.

---

## 5. Screens

1. Login / Sign up (email magic link or Google)
2. Pair screen (show my code / enter partner's code)
3. **Home**: countdowns, next date card, today's to-dos, month spend
4. **Calendar**: month view + list of dates
5. **Add/Edit Date**: form + **map picker**
6. **Date detail**: mini map, Waze/Maps buttons, photos, rating, cost
7. **Places map**: saved pins, filter, spinner button
8. **To-dos**: lists → items
9. **Budget**: totals, split balance, list of expenses
10. **Memories**: memory map + timeline
11. Settings: profile, anniversary, notifications toggle, unpair

Bottom nav: **Home · Calendar · Places · To-do · Budget**

---

## 6. Build order (one Claude Code prompt per step)

1. **Setup**: "Create a Next.js + Tailwind app, add Supabase client, env vars, and PWA manifest + icons. Mobile-first layout with bottom nav."
2. **Auth + pairing**: "Add Supabase auth and the couples/profiles tables with RLS. Build the pair screen with an invite code."
3. **Dates (no map yet)**: "Build the dates table, calendar view, and add/edit/delete date form. Add Realtime sync."
4. **Map picker**: "Add a Leaflet map picker to the date form: search places, tap to drop a pin, use my location. Save lat/lng/place. Add a mini map and Waze/Google Maps buttons on date detail."
5. **To-dos**: "Build todo_lists and todos with realtime."
6. **Budget**: "Build expenses with a monthly total and split balance. Link a date's actual cost to an expense."
7. **Saved places + spinner**: "Build the places table, Places map tab with pins and filters, and a random picker."
8. **Home + countdowns**: "Build the home dashboard with countdown cards and recurring events."
9. **Push reminders**: "Add Web Push: subscribe in settings, Supabase Edge Function + cron to send due reminders."
10. **Memories**: "Add photo upload to Supabase Storage per date, a rating, a memory map and a timeline."
11. **Polish**: dark mode, loading states, empty states, offline caching.
12. **Deploy**: push to GitHub → import in Vercel → add env vars → test install on both phones.

---

## 7. Env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server/edge only, never in frontend
NEXT_PUBLIC_GOOGLE_PLACES_KEY=    # optional; restrict to your domain
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

---

## 8. Gotchas

- **iOS push** only works after the user does "Add to Home Screen" (iOS 16.4+).
- **Google Places** costs money past the free credit, so set a **budget alert** + domain restriction. Start with Nominatim if unsure.
- Nominatim is limited to **1 request/sec**, so debounce the search box (~500 ms).
- Store all times as **timestamptz**; display in `Asia/Kuala_Lumpur`.
- Use your **own name and branding**, not Kita's.
