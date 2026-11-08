-- Phase 7: saved places / wishlist ("Want to go" / "Been there" / "Favourite").

create table public.places (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id()
             references public.couples (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 200),
  address    text check (char_length(address) <= 500),
  lat        float8 not null check (lat between -90 and 90),
  lng        float8 not null check (lng between -180 and 180),
  place_id   text,
  category   text not null default 'food'
             check (category in ('food', 'cafe', 'dessert', 'activity', 'outdoors',
                                 'shopping', 'staycation', 'other')),
  status     text not null default 'want' check (status in ('want', 'been', 'fav')),
  notes      text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index places_couple_idx on public.places (couple_id, status);

alter table public.places enable row level security;

create policy "places: couple only" on public.places
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

revoke all on public.places from anon, authenticated;
grant select, delete on public.places to authenticated;
grant insert (name, address, lat, lng, place_id, category, status, notes),
      update (name, address, lat, lng, place_id, category, status, notes)
  on public.places to authenticated;

alter publication supabase_realtime add table public.places;
