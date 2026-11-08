import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { displayName, memberNames, requireCouple } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  CATEGORIES,
  fetchBalance,
  fetchDueTodos,
  fetchEvents,
  fetchExpensesForMonth,
  fetchNextDate,
  fmtRM,
  monthSpend,
} from "@/lib/data";
import {
  anniversaryEvent,
  countdownText,
  daysBetween,
  EVENT_KINDS,
  nextOccurrence,
  occurrenceLabel,
  type Occurrence,
} from "@/lib/events";
import { addDays, addMonths, dayKey, fmtDayShort, fmtRelativeDay, fmtTime, klToISO } from "@/lib/time";
import { TodayTodos } from "./today-todos";

export default async function HomePage() {
  const session = await requireCouple();
  const { profile, partner, couple } = session;
  const me = displayName(profile, "You");
  const now = new Date();
  const today = dayKey(now);
  const month = today.slice(0, 7);
  const sb = await createClient();
  const [next, expenses, balance, events, dueTodos] = await Promise.all([
    fetchNextDate(sb, now.toISOString()),
    fetchExpensesForMonth(sb, month, addMonths(month, 1)),
    fetchBalance(sb, profile.id),
    fetchEvents(sb),
    fetchDueTodos(sb, klToISO(addDays(today, 1))),
  ]);

  const anniversary = anniversaryEvent(couple.anniversary);
  const upcoming = [...(anniversary ? [anniversary] : []), ...events]
    .map((e) => nextOccurrence(e, today))
    .filter((o): o is Occurrence => o !== null)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 6);
  const nextDay = next ? dayKey(next.starts_at) : null;

  return (
    <>
      <PageHeader
        title={partner ? `${me} & ${displayName(partner)}` : `Hi, ${me}`}
        action={
          <Link
            href="/settings"
            aria-label="Settings"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft font-semibold text-brand"
          >
            {me.charAt(0).toUpperCase()}
          </Link>
        }
      />

      {!partner && (
        <Link href="/pair" className="mx-4 mb-4 block rounded-2xl border border-brand/30 bg-brand-soft p-4">
          <p className="font-medium">Waiting for your partner</p>
          <p className="mt-0.5 text-sm text-muted">
            Share code <span className="font-mono font-semibold text-brand">{couple.invite_code}</span>{" "}
            so they can join.
          </p>
        </Link>
      )}

      {next && nextDay ? (
        <Link href={`/dates/${next.id}`} className="mx-4 block rounded-2xl bg-brand p-5 text-white shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm opacity-90">
              Next date · {CATEGORIES[next.category].emoji} {CATEGORIES[next.category].label}
            </p>
            <p className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-semibold">
              {daysBetween(today, nextDay) === 0 ? "Today!" : `in ${countdownText(daysBetween(today, nextDay))}`}
            </p>
          </div>
          <p className="mt-1 text-2xl font-semibold">{next.title}</p>
          <p className="mt-2 text-sm opacity-90">
            {fmtRelativeDay(nextDay, today)} · {fmtTime(next.starts_at)}
            {next.place_name && ` · ${next.place_name}`}
          </p>
        </Link>
      ) : (
        <Link href="/dates/new" className="mx-4 block rounded-2xl bg-brand p-5 text-white shadow-sm">
          <p className="text-sm opacity-90">Next date</p>
          <p className="mt-1 text-2xl font-semibold">Nothing planned yet</p>
          <p className="mt-2 text-sm opacity-90">Tap to plan one →</p>
        </Link>
      )}

      <section className="mt-5">
        <div className="flex items-baseline justify-between px-4 pb-2">
          <h2 className="font-semibold">Countdowns</h2>
          <Link href="/events" className="text-sm font-medium text-brand">
            {upcoming.length ? "Manage" : "Add"}
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <Link
            href="/events"
            className="mx-4 block rounded-2xl border border-dashed border-border bg-surface p-4 text-sm text-muted"
          >
            Add your anniversary and birthdays to see countdowns here.
          </Link>
        ) : (
          <ul className="flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {upcoming.map((o) => {
              const k = EVENT_KINDS[o.event.kind];
              return (
                <li
                  key={`${o.event.id}-${o.day}`}
                  className="w-40 shrink-0 snap-start rounded-2xl border border-border bg-surface p-4"
                  style={o.daysAway === 0 ? { borderColor: k.color, background: `${k.color}18` } : undefined}
                >
                  <p className="text-2xl" aria-hidden>
                    {k.emoji}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums" style={{ color: k.color }}>
                    {countdownText(o.daysAway)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm font-medium">{occurrenceLabel(o)}</p>
                  <p className="mt-0.5 text-xs text-muted">{fmtDayShort(o.day)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <TodayTodos
        initial={dueTodos}
        coupleId={couple.id}
        today={today}
        myId={profile.id}
        names={memberNames(session)}
      />

      <Link
        href="/memories"
        className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <span className="text-2xl" aria-hidden>
          📸
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Memories</span>
          <span className="block text-sm text-muted">Photos, notes and a map of every date</span>
        </span>
        <span className="text-muted" aria-hidden>
          ›
        </span>
      </Link>

      <Link
        href="/budget"
        className="mx-4 mt-3 flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
      >
        <div>
          <p className="text-sm text-muted">Spent this month</p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums">{fmtRM(monthSpend(expenses))}</p>
        </div>
        {partner && balance !== 0 && (
          <p className="text-right text-sm text-muted">
            {balance > 0
              ? `${displayName(partner)} owes you ${fmtRM(balance)}`
              : `You owe ${displayName(partner)} ${fmtRM(-balance)}`}
          </p>
        )}
      </Link>
    </>
  );
}
