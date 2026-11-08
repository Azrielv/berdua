import { requireCoupleAnd } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchDatesBetween, fetchEvents } from "@/lib/data";
import { anniversaryEvent, occurrencesBetween } from "@/lib/events";
import { dayKey, isDayKey, isMonthKey, klToISO, monthGrid } from "@/lib/time";
import { CalendarClient } from "./calendar-client";

export const metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const { m, d } = await searchParams;
  const today = dayKey(new Date());
  const month = isMonthKey(m) ? m : isDayKey(d) ? d.slice(0, 7) : today.slice(0, 7);
  const grid = monthGrid(month);
  const sb = await createClient();
  const [{ couple }, dates, events] = await requireCoupleAnd([fetchDatesBetween(sb, klToISO(grid.start), klToISO(grid.end)),
    fetchEvents(sb),
  ]);
  const anniversary = anniversaryEvent(couple.anniversary);
  const specialDays = occurrencesBetween(anniversary ? [anniversary, ...events] : events, grid.start, grid.end);

  return (
    <CalendarClient
      key={month}
      month={month}
      today={today}
      coupleId={couple.id}
      initialDates={dates}
      specialDays={specialDays}
      initialDay={isDayKey(d) ? d : null}
    />
  );
}
