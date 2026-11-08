-- Phase 8: special days (birthdays, anniversaries…), optionally repeating yearly.
-- The couple's own anniversary lives on couples.anniversary (phase 2).

create table public.events (
  id               uuid primary key default gen_random_uuid(),
  couple_id        uuid not null default public.my_couple_id()
                   references public.couples (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 80),
  event_date       date not null,
  kind             text not null default 'other' check (kind in ('birthday', 'anniversary', 'other')),
  recurring_yearly boolean not null default true,
  created_at       timestamptz not null default now()
);
create index events_couple_idx on public.events (couple_id);

alter table public.events enable row level security;

create policy "events: couple only" on public.events
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

revoke all on public.events from anon, authenticated;
grant select, delete on public.events to authenticated;
grant insert (title, event_date, kind, recurring_yearly),
      update (title, event_date, kind, recurring_yearly)
  on public.events to authenticated;

alter publication supabase_realtime add table public.events;
