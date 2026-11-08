-- Phase 9: push reminders.
-- Rows are created by triggers (dates, to-dos) and by claim_due_reminders()
-- (birthdays/special days/anniversary). pg_cron calls the app's
-- /api/reminders/dispatch every few minutes, which claims due rows and sends
-- Web Push to both partners. See supabase/cron.sql.

create table public.reminders (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples (id) on delete cascade,
  target_type text not null check (target_type in
                ('date_day_before', 'date_soon', 'todo_due', 'event', 'anniversary')),
  target_id   uuid not null,
  remind_at   timestamptz not null,
  sent        boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (target_type, target_id, remind_at)
);
create index reminders_due_idx on public.reminders (remind_at) where not sent;

alter table public.reminders enable row level security;
create policy "reminders: couple read" on public.reminders
  for select to authenticated
  using (couple_id = (select public.my_couple_id()));
revoke all on public.reminders from anon, authenticated;
grant select on public.reminders to authenticated;

-- ───────────── Dates: 1 day before + 2 hours before ─────────────
create or replace function public.schedule_date_reminders()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.reminders
     where target_id = old.id and target_type in ('date_day_before', 'date_soon') and not sent;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  insert into public.reminders (couple_id, target_type, target_id, remind_at)
  select new.couple_id, v.t, new.id, v.at
    from (values ('date_day_before', new.starts_at - interval '1 day'),
                 ('date_soon',       new.starts_at - interval '2 hours')) as v (t, at)
   where v.at > now()
  on conflict do nothing;
  return new;
end
$$;

create trigger dates_schedule_reminders
  after insert or update of starts_at or delete on public.dates
  for each row execute function public.schedule_date_reminders();

-- ───────────── To-dos: at due_at (09:00 KL on the due day) ─────────────
create or replace function public.schedule_todo_reminders()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    delete from public.reminders where target_id = old.id and target_type = 'todo_due' and not sent;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if new.due_at is not null and not new.done and new.due_at > now() then
    insert into public.reminders (couple_id, target_type, target_id, remind_at)
    values (new.couple_id, 'todo_due', new.id, new.due_at)
    on conflict do nothing;
  end if;
  return new;
end
$$;

create trigger todos_schedule_reminders
  after insert or update of due_at, done or delete on public.todos
  for each row execute function public.schedule_todo_reminders();

-- ───────────── Yearly days ─────────────
-- The date an event falls on in year y (29 Feb → 28 Feb in non-leap years).
create or replace function public.occurrence_in(d date, y int)
returns date
language sql immutable set search_path = ''
as $$
  select case
    when extract(month from d) = 2 and extract(day from d) = 29
         and not (y % 4 = 0 and (y % 100 <> 0 or y % 400 = 0))
      then make_date(y, 2, 28)
    else make_date(y, extract(month from d)::int, extract(day from d)::int)
  end
$$;

-- ───────────── Dispatcher entry point (service role only) ─────────────
-- 1. Schedules "tomorrow is …" reminders (09:00 KL today) for special days.
-- 2. Drops anything more than a day late (e.g. cron was paused).
-- 3. Atomically marks due reminders as sent and returns them, so overlapping
--    cron runs never double-send.
create or replace function public.claim_due_reminders()
returns setof public.reminders
language plpgsql security definer set search_path = ''
as $$
declare
  today    date := (now() at time zone 'Asia/Kuala_Lumpur')::date;
  tomorrow date := today + 1;
  nine_am  timestamptz := (today + time '09:00') at time zone 'Asia/Kuala_Lumpur';
begin
  insert into public.reminders (couple_id, target_type, target_id, remind_at)
  select e.couple_id, 'event', e.id, nine_am
    from public.events e
   where (e.recurring_yearly and e.event_date <= tomorrow
          and public.occurrence_in(e.event_date, extract(year from tomorrow)::int) = tomorrow)
      or (not e.recurring_yearly and e.event_date = tomorrow)
  on conflict do nothing;

  insert into public.reminders (couple_id, target_type, target_id, remind_at)
  select c.id, 'anniversary', c.id, nine_am
    from public.couples c
   where c.anniversary is not null and c.anniversary < tomorrow
     and public.occurrence_in(c.anniversary, extract(year from tomorrow)::int) = tomorrow
  on conflict do nothing;

  update public.reminders set sent = true
   where not sent and remind_at < now() - interval '1 day';

  return query
  update public.reminders r set sent = true
   where r.id in (select id from public.reminders
                   where not sent and remind_at <= now()
                   order by remind_at
                   limit 200
                   for update skip locked)
  returning r.*;
end
$$;

revoke execute on function public.schedule_date_reminders(), public.schedule_todo_reminders(),
  public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;
