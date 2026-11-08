-- Phase 2: auth + couple pairing.
-- Run in Supabase → SQL Editor (or `supabase db push`).

-- ───────────────────────── Tables ─────────────────────────
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  anniversary date,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text check (char_length(name) <= 40),
  avatar_url        text,
  couple_id         uuid references public.couples (id) on delete set null,
  push_subscription jsonb,
  created_at        timestamptz not null default now()
);
create index profiles_couple_id_idx on public.profiles (couple_id);

-- ───────────────────── Helper for RLS ─────────────────────
-- SECURITY DEFINER so policies on profiles can call it without recursion.
-- Every later table's RLS uses: couple_id = (select public.my_couple_id())
create or replace function public.my_couple_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

-- ─────────────────────────── RLS ──────────────────────────
alter table public.couples  enable row level security;
alter table public.profiles enable row level security;

create policy "profiles: read self and partner" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or couple_id = (select public.my_couple_id()));

create policy "profiles: update self" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "couples: members read" on public.couples
  for select to authenticated
  using (id = (select public.my_couple_id()));

create policy "couples: members update" on public.couples
  for update to authenticated
  using (id = (select public.my_couple_id()))
  with check (id = (select public.my_couple_id()));

-- Column-level privileges: pairing only happens through the RPCs below,
-- and push_subscription is never readable by the partner.
revoke all on public.profiles, public.couples from anon, authenticated;
grant select (id, name, avatar_url, couple_id, created_at) on public.profiles to authenticated;
grant update (name, avatar_url, push_subscription)          on public.profiles to authenticated;
grant select (id, invite_code, anniversary, created_at)     on public.couples  to authenticated;
grant update (anniversary)                                  on public.couples  to authenticated;

-- ──────────────── Create a profile on sign-up ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name',
                  new.raw_user_meta_data ->> 'name',
                  split_part(new.email, '@', 1)), 40),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Pairing RPCs ───────────────────
-- create_couple(): returns my couple, creating one with a fresh code if needed.
create or replace function public.create_couple()
returns public.couples
language plpgsql security definer set search_path = ''
as $$
declare
  me       uuid := auth.uid();
  current  uuid;
  c        public.couples;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  code     text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  insert into public.profiles (id) values (me) on conflict (id) do nothing;

  select couple_id into current from public.profiles where id = me for update;
  if current is not null then
    select * into c from public.couples where id = current;
    return c;
  end if;

  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.couples (invite_code) values (code) returning * into c;
      exit;
    exception when unique_violation then
      -- collision: try another code
    end;
  end loop;

  update public.profiles set couple_id = c.id where id = me;
  return c;
end
$$;

-- join_couple(code): link me to my partner's couple.
-- If I'd already made my own (still solo) code, that empty couple is removed.
create or replace function public.join_couple(code text)
returns public.couples
language plpgsql security definer set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  target  public.couples;
  current uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  insert into public.profiles (id) values (me) on conflict (id) do nothing;

  select * into target from public.couples
   where invite_code = upper(trim(code))
   for update;                       -- serialises two people joining at once
  if not found then
    raise exception 'That code doesn''t match anyone. Check it and try again.';
  end if;

  select couple_id into current from public.profiles where id = me for update;
  if current = target.id then return target; end if;

  if (select count(*) from public.profiles where couple_id = target.id) >= 2 then
    raise exception 'That code has already been used by a couple.';
  end if;

  if current is not null
     and (select count(*) from public.profiles where couple_id = current) > 1 then
    raise exception 'You''re already paired. Unpair in Settings first.';
  end if;

  update public.profiles set couple_id = target.id where id = me;
  if current is not null then
    delete from public.couples where id = current;
  end if;
  return target;
end
$$;

-- leave_couple(): unpair. The couple (and later its data) is deleted once empty.
create or replace function public.leave_couple()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  me      uuid := auth.uid();
  current uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select couple_id into current from public.profiles where id = me for update;
  if current is null then return; end if;

  update public.profiles set couple_id = null where id = me;
  if not exists (select 1 from public.profiles where couple_id = current) then
    delete from public.couples where id = current;
  end if;
end
$$;

revoke execute on function public.my_couple_id(), public.create_couple(),
  public.join_couple(text), public.leave_couple() from public, anon;
grant execute on function public.my_couple_id(), public.create_couple(),
  public.join_couple(text), public.leave_couple() to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
