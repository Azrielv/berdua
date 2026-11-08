"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { CATEGORIES, fetchDatesBetween, type DateRow } from "@/lib/data";
import {
  addMonths,
  dayKey,
  fmtDayLong,
  fmtMonth,
  fmtRelativeDay,
  fmtTime,
  klToISO,
  monthGrid,
} from "@/lib/time";
import { PageHeader, EmptyState, Fab } from "@/components/page-header";
import { DateCard } from "@/components/date-card";
import { EVENT_KINDS, occurrenceLabel, type SpecialEvent } from "@/lib/events";

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

export function CalendarClient({
  month,
  today,
  coupleId,
  initialDates,
  specialDays,
  initialDay,
}: {
  month: string;
  today: string;
  coupleId: string;
  initialDates: DateRow[];
  specialDays: { event: SpecialEvent; day: string }[];
  initialDay: string | null;
}) {
  const grid = monthGrid(month);
  const { data: dates } = useLive(
    initialDates,
    () => fetchDatesBetween(createClient(), klToISO(grid.start), klToISO(grid.end)),
    [{ table: "dates", filter: `couple_id=eq.${coupleId}` }],
  );
  const [selected, setSelected] = useState<string | null>(initialDay);

  const byDay = new Map<string, DateRow[]>();
  for (const d of dates) {
    const k = dayKey(d.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), d]);
  }

  const listed = selected
    ? (byDay.get(selected) ?? [])
    : dates.filter((d) => dayKey(d.starts_at).startsWith(month));
  const specialOn = (k: string) => specialDays.filter((s) => s.day === k);
  const listedSpecial = selected
    ? specialOn(selected)
    : specialDays.filter((s) => s.day.startsWith(month));
  const newDay = selected ?? (today.startsWith(month) ? today : `${month}-01`);

  const navBtn = "grid h-10 w-10 place-items-center rounded-full text-muted active:bg-border/50";

  return (
    <>
      <PageHeader
        title={fmtMonth(month)}
        action={
          <div className="flex items-center">
            {!today.startsWith(month) && (
              <Link href="/calendar" className="mr-1 rounded-full px-3 py-1.5 text-sm font-medium text-brand">
                Today
              </Link>
            )}
            <Link href={`/calendar?m=${addMonths(month, -1)}`} aria-label="Previous month" className={navBtn}>
              ‹
            </Link>
            <Link href={`/calendar?m=${addMonths(month, 1)}`} aria-label="Next month" className={navBtn}>
              ›
            </Link>
          </div>
        }
      />

      <div className="px-3">
        <div className="grid grid-cols-7 pb-1 text-center text-xs font-medium text-muted">
          {WEEK.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.days.map((k) => {
            const inMonth = k.startsWith(month);
            const isSel = k === selected;
            const isToday = k === today;
            const items = byDay.get(k) ?? [];
            const dots = [
              ...specialOn(k).map((s) => ({ id: `e-${s.event.id}`, color: EVENT_KINDS[s.event.kind].color })),
              ...items.map((d) => ({ id: d.id, color: CATEGORIES[d.category].color })),
            ];
            return (
              <button
                key={k}
                onClick={() => setSelected(isSel ? null : k)}
                aria-pressed={isSel}
                aria-label={`${fmtDayLong(k)}${items.length ? `, ${items.length} plans` : ""}`}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition ${
                  isSel
                    ? "bg-brand font-semibold text-white"
                    : isToday
                      ? "bg-brand-soft font-semibold text-brand"
                      : inMonth
                        ? ""
                        : "text-muted/50"
                }`}
              >
                {Number(k.slice(8))}
                <span className="flex h-1.5 gap-0.5">
                  {dots.slice(0, 3).map((d) => (
                    <span
                      key={d.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: isSel ? "#fff" : d.color }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-5 px-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold">{selected ? fmtDayLong(selected) : "This month"}</h2>
          {selected && (
            <button onClick={() => setSelected(null)} className="text-sm text-muted">
              Show all
            </button>
          )}
        </div>
        {listedSpecial.length > 0 && (
          <ul className="mb-2 space-y-2">
            {listedSpecial.map((s) => (
              <li key={`${s.event.id}-${s.day}`}>
                <Link
                  href="/events"
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{ background: `${EVENT_KINDS[s.event.kind].color}18` }}
                >
                  <span className="text-xl" aria-hidden>
                    {EVENT_KINDS[s.event.kind].emoji}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {occurrenceLabel({
                      event: s.event,
                      years: s.event.recurring_yearly
                        ? +s.day.slice(0, 4) - +s.event.event_date.slice(0, 4) || null
                        : null,
                    })}
                  </span>
                  {!selected && (
                    <span className="shrink-0 text-sm text-muted">{fmtRelativeDay(s.day, today)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {listed.length === 0 && listedSpecial.length > 0 ? null : listed.length === 0 ? (
          <EmptyState
            title={selected ? "Nothing planned" : "No dates this month"}
            body="Tap + to plan something together."
          />
        ) : (
          <ul className="space-y-2">
            {listed.map((d) => (
              <li key={d.id}>
                <DateCard
                  date={d}
                  meta={
                    selected
                      ? undefined
                      : `${fmtRelativeDay(dayKey(d.starts_at), today)} · ${fmtTime(d.starts_at)}`
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Fab href={`/dates/new?day=${newDay}`} label="Add a date" />
    </>
  );
}
