-- Phases 3–5: dates (with map location) and shared to-dos.
-- couple_id defaults to the caller's couple, so the app never sends it.

-- ───────────────────────── Dates ─────────────────────────
create table public.dates (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null default public.my_couple_id()
              references public.couples (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 120),
  starts_at   timestamptz not null,
  category    text not null default 'date_night'
              check (category in ('date_night', 'anniversary', 'trip', 'errand')),
  notes       text check (char_length(notes) <= 2000),
  -- location (phase 4)
  place_name  text check (char_length(place_name) <= 200),
  address     text check (char_length(address) <= 500),
  lat         float8 check (lat between -90 and 90),
  lng         float8 check (lng between -180 and 180),
  place_id    text,
  -- later phases
  est_cost    numeric(10, 2) check (est_cost >= 0),
  actual_cost numeric(10, 2) check (actual_cost >= 0),
  rating      int check (rating between 1 and 5),
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check ((lat is null) = (lng is null))
);
create index dates_couple_starts_idx on public.dates (couple_id, starts_at);

-- ──────────────────────── To-dos ─────────────────────────
create table public.todo_lists (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id()
             references public.couples (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index todo_lists_couple_idx on public.todo_lists (couple_id);

create table public.todos (
  id         uuid primary key default gen_random_uuid(),
  list_id    uuid not null references public.todo_lists (id) on delete cascade,
  -- denormalised so RLS and realtime filters stay simple
  couple_id  uuid not null default public.my_couple_id()
             references public.couples (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 300),
  done       boolean not null default false,
  done_by    uuid references public.profiles (id) on delete set null,
  due_at     timestamptz,
  created_at timestamptz not null default now()
);
create index todos_list_idx on public.todos (list_id);
create index todos_couple_due_idx on public.todos (couple_id, due_at);

-- done_by is always whoever ticked it (can't be spoofed by the client).
create or replace function public.set_todo_done_by()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.done and (tg_op = 'INSERT' or not old.done) then
    new.done_by := auth.uid();
  elsif not new.done then
    new.done_by := null;
  end if;
  return new;
end
$$;

create trigger todos_set_done_by
  before insert or update of done on public.todos
  for each row execute function public.set_todo_done_by();

-- ─────────────────────────── RLS ──────────────────────────
alter table public.dates      enable row level security;
alter table public.todo_lists enable row level security;
alter table public.todos      enable row level security;

create policy "dates: couple only" on public.dates
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

create policy "todo_lists: couple only" on public.todo_lists
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (couple_id = (select public.my_couple_id()));

create policy "todos: couple only" on public.todos
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (
    couple_id = (select public.my_couple_id())
    and exists (select 1 from public.todo_lists l
                where l.id = list_id and l.couple_id = todos.couple_id)
  );

revoke all on public.dates, public.todo_lists, public.todos from anon, authenticated;
grant select, delete on public.dates, public.todo_lists, public.todos to authenticated;

grant insert (title, starts_at, category, notes, place_name, address, lat, lng, place_id,
              est_cost, actual_cost, rating),
      update (title, starts_at, category, notes, place_name, address, lat, lng, place_id,
              est_cost, actual_cost, rating)
  on public.dates to authenticated;
grant insert (name), update (name) on public.todo_lists to authenticated;
grant insert (list_id, text, done, due_at), update (text, done, due_at)
  on public.todos to authenticated;

-- ──────────────────────── Realtime ────────────────────────
alter publication supabase_realtime add table public.dates, public.todo_lists, public.todos;
