-- Phase 6: budget. Every expense is split 50/50 between the couple.
-- 'settle_up' rows are payments between partners: they count 100% towards
-- the balance and are excluded from spending totals.

create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null default public.my_couple_id()
             references public.couples (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount > 0),
  category   text not null default 'other'
             check (category in ('food', 'date', 'groceries', 'transport', 'shopping',
                                 'bills', 'travel', 'other', 'settle_up')),
  paid_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  note       text check (char_length(note) <= 200),
  spent_on   date not null default (now() at time zone 'Asia/Kuala_Lumpur')::date,
  -- set only by the trigger below; one expense per date
  date_id    uuid unique references public.dates (id) on delete set null,
  created_at timestamptz not null default now()
);
create index expenses_couple_spent_idx on public.expenses (couple_id, spent_on);

alter table public.expenses enable row level security;

create policy "expenses: couple only" on public.expenses
  for all to authenticated
  using (couple_id = (select public.my_couple_id()))
  with check (
    couple_id = (select public.my_couple_id())
    and paid_by in (select p.id from public.profiles p
                    where p.couple_id = (select public.my_couple_id()))
  );

revoke all on public.expenses from anon, authenticated;
grant select, delete on public.expenses to authenticated;
grant insert (amount, category, paid_by, note, spent_on),
      update (amount, category, paid_by, note, spent_on)
  on public.expenses to authenticated;

-- ───────────── Date → Budget link ─────────────
-- A date's actual_cost becomes (or updates) its expense; clearing it removes
-- the expense. "Who paid" defaults to whoever entered the cost and can be
-- changed on the Budget tab without being overwritten later.
create or replace function public.sync_date_expense()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.actual_cost is null or new.actual_cost <= 0 then
    delete from public.expenses where date_id = new.id;
  else
    insert into public.expenses (couple_id, amount, category, paid_by, note, spent_on, date_id)
    values (new.couple_id, new.actual_cost, 'date', coalesce(auth.uid(), new.created_by),
            left(new.title, 200), (new.starts_at at time zone 'Asia/Kuala_Lumpur')::date, new.id)
    on conflict (date_id) do update
      set amount = excluded.amount, note = excluded.note, spent_on = excluded.spent_on;
  end if;
  return null;
end
$$;
revoke execute on function public.sync_date_expense() from public, anon, authenticated;

create trigger dates_sync_expense
  after insert or update of actual_cost, title, starts_at on public.dates
  for each row execute function public.sync_date_expense();

-- ───────────── Balance ─────────────
-- How much each partner is owed overall. Net = mine − partner's;
-- positive means the partner owes me.
create or replace function public.expense_balance()
returns table (user_id uuid, credit numeric)
language sql stable security invoker set search_path = ''
as $$
  select paid_by,
         sum(case when category = 'settle_up' then amount else amount / 2 end)
    from public.expenses
   where couple_id = public.my_couple_id() and paid_by is not null
   group by paid_by
$$;
revoke execute on function public.expense_balance() from public, anon;
grant execute on function public.expense_balance() to authenticated;

alter publication supabase_realtime add table public.expenses;
