import { TIME_ZONE } from "./config";

// Malaysia has had no DST since 1982, so the offset is fixed.
const OFFSET = "+08:00";

// Formatting is done by hand from numeric parts so server and browser render
// identical strings (avoids hydration mismatches between ICU versions).
const partsFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parts(d: Date | string) {
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(d))) o[p.type] = p.value;
  return o;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "YYYY-MM-DD" in KL time. */
export function dayKey(d: Date | string) {
  const p = parts(d);
  return `${p.year}-${p.month}-${p.day}`;
}
/** "HH:mm" (24h) in KL time. */
export function timeKey(d: Date | string) {
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
}
/** KL wall-clock day + time → ISO timestamp. */
export function klToISO(day: string, time = "00:00") {
  return new Date(`${day}T${time}:00${OFFSET}`).toISOString();
}

export function addDays(key: string, n: number) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function weekday(key: string) {
  return new Date(`${key}T00:00:00Z`).getUTCDay();
}
export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}
export function isMonthKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}
export function isDayKey(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

/** Monday-first grid of whole weeks covering the month. `end` is exclusive. */
export function monthGrid(month: string) {
  const first = `${month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  const start = addDays(first, -lead);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  return { days, start, end: addDays(start, weeks * 7) };
}

export function fmtTime(d: Date | string) {
  const p = parts(d);
  const h = Number(p.hour);
  return `${h % 12 || 12}:${p.minute} ${h < 12 ? "AM" : "PM"}`;
}
export function fmtMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
/** "Friday, 20 November 2026" */
export function fmtDayLong(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${WEEKDAYS[weekday(key)]}, ${d} ${MONTHS[m - 1]} ${y}`;
}
/** "Fri, 20 Nov" */
export function fmtDayShort(key: string) {
  const [, m, d] = key.split("-").map(Number);
  return `${WEEKDAYS[weekday(key)].slice(0, 3)}, ${d} ${MONTHS[m - 1].slice(0, 3)}`;
}
/** "Today" / "Tomorrow" / "Fri, 20 Nov" */
export function fmtRelativeDay(key: string, today: string) {
  if (key === today) return "Today";
  if (key === addDays(today, 1)) return "Tomorrow";
  if (key === addDays(today, -1)) return "Yesterday";
  return fmtDayShort(key);
}
