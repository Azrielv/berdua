// Special days + countdown maths. Pure functions on "YYYY-MM-DD" keys, so
// they behave the same on the server and in the browser.

export type EventKind = "birthday" | "anniversary" | "other";

export type SpecialEvent = {
  id: string;
  title: string;
  event_date: string; // YYYY-MM-DD (original date; year = birth year / first year)
  kind: EventKind;
  recurring_yearly: boolean;
};

export const EVENT_KINDS: Record<EventKind, { label: string; emoji: string; color: string }> = {
  birthday: { label: "Birthday", emoji: "🎂", color: "#ec4899" },
  anniversary: { label: "Anniversary", emoji: "💍", color: "#a855f7" },
  other: { label: "Special day", emoji: "⭐", color: "#f59e0b" },
};

export const COUPLE_ANNIVERSARY_ID = "couple-anniversary";

/** The couple's anniversary (from couples.anniversary) as a yearly event. */
export function anniversaryEvent(date: string | null): SpecialEvent | null {
  return date
    ? { id: COUPLE_ANNIVERSARY_ID, title: "Our anniversary", event_date: date, kind: "anniversary", recurring_yearly: true }
    : null;
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const toUTC = (key: string) => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10));

export function daysBetween(from: string, to: string) {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
}

/** The event's date in a given year (29 Feb → 28 Feb in non-leap years). */
export function occurrenceIn(eventDate: string, year: number) {
  let md = eventDate.slice(5);
  if (md === "02-29" && !isLeap(year)) md = "02-28";
  return `${String(year).padStart(4, "0")}-${md}`;
}

export type Occurrence = {
  event: SpecialEvent;
  day: string;
  daysAway: number;
  /** Years since event_date (age turning / anniversary number); null if unknown or 0. */
  years: number | null;
};

/** Next occurrence on or after `today`, or null if a one-off event has passed. */
export function nextOccurrence(event: SpecialEvent, today: string): Occurrence | null {
  let day = event.event_date;
  if (event.recurring_yearly) {
    const y = +today.slice(0, 4);
    day = occurrenceIn(event.event_date, y);
    if (day < today) day = occurrenceIn(event.event_date, y + 1);
  } else if (day < today) {
    return null;
  }
  const years = event.recurring_yearly ? +day.slice(0, 4) - +event.event_date.slice(0, 4) : 0;
  return { event, day, daysAway: daysBetween(today, day), years: years > 0 ? years : null };
}

/** All occurrences that fall within [start, end). */
export function occurrencesBetween(events: SpecialEvent[], start: string, end: string) {
  const out: { event: SpecialEvent; day: string }[] = [];
  for (const e of events) {
    if (!e.recurring_yearly) {
      if (e.event_date >= start && e.event_date < end) out.push({ event: e, day: e.event_date });
      continue;
    }
    for (let y = +start.slice(0, 4); y <= +end.slice(0, 4); y++) {
      const day = occurrenceIn(e.event_date, y);
      if (day >= start && day < end && day >= e.event_date) out.push({ event: e, day });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** "Aina's birthday · turns 28", "Our anniversary · 5th" */
export function occurrenceLabel(o: Pick<Occurrence, "event" | "years">) {
  if (!o.years) return o.event.title;
  if (o.event.kind === "birthday") return `${o.event.title} · turns ${o.years}`;
  if (o.event.kind === "anniversary") return `${o.event.title} · ${ordinal(o.years)}`;
  return o.event.title;
}

/** "Today!", "Tomorrow", "12 days" */
export function countdownText(days: number) {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}
