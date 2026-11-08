import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecialEvent } from "./events";

// ───────────── Dates ─────────────
export type DateCategory = "date_night" | "anniversary" | "trip" | "errand";

export const CATEGORIES: Record<DateCategory, { label: string; emoji: string; color: string }> = {
  date_night: { label: "Date night", emoji: "🍷", color: "#c8324a" },
  anniversary: { label: "Anniversary", emoji: "💍", color: "#a855f7" },
  trip: { label: "Trip", emoji: "✈️", color: "#0ea5e9" },
  errand: { label: "Errand", emoji: "🛒", color: "#f59e0b" },
};

export type DateRow = {
  id: string;
  couple_id: string;
  title: string;
  starts_at: string;
  category: DateCategory;
  notes: string | null;
  place_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string | null;
  est_cost: number | null;
  actual_cost: number | null;
  rating: number | null;
  memory: string | null;
  created_by: string | null;
  created_at: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export async function fetchDatesBetween(sb: SupabaseClient, fromISO: string, toISO: string) {
  const { data, error } = await sb
    .from("dates")
    .select("*")
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO)
    .order("starts_at");
  if (error) throw error;
  return data as DateRow[];
}

export async function fetchNextDate(sb: SupabaseClient, nowISO: string) {
  const { data, error } = await sb
    .from("dates")
    .select("*")
    .gte("starts_at", nowISO)
    .order("starts_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as DateRow | null;
}

export async function fetchDate(sb: SupabaseClient, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await sb.from("dates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as DateRow | null;
}

// ───────────── To-dos ─────────────
export type TodoList = { id: string; name: string; created_at: string };
export type TodoListSummary = TodoList & { todos: { done: boolean }[] };
export type Todo = {
  id: string;
  list_id: string;
  text: string;
  done: boolean;
  done_by: string | null;
  due_at: string | null;
  created_at: string;
};

export async function fetchTodoLists(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("todo_lists")
    .select("id, name, created_at, todos(done)")
    .order("created_at");
  if (error) throw error;
  return data as TodoListSummary[];
}

export async function fetchTodoList(sb: SupabaseClient, id: string) {
  if (!isUuid(id)) return null;
  const [list, todos] = await Promise.all([
    sb.from("todo_lists").select("id, name, created_at").eq("id", id).maybeSingle(),
    sb.from("todos").select("*").eq("list_id", id).order("created_at"),
  ]);
  if (list.error) throw list.error;
  if (todos.error) throw todos.error;
  if (!list.data) return null;
  return { list: list.data as TodoList, todos: todos.data as Todo[] };
}

// ───────────── Budget ─────────────
export type ExpenseCategory =
  | "food" | "date" | "groceries" | "transport" | "shopping" | "bills" | "travel" | "other" | "settle_up";

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; emoji: string; color: string }> = {
  food: { label: "Food", emoji: "🍜", color: "#f97316" },
  date: { label: "Dates", emoji: "💕", color: "#c8324a" },
  groceries: { label: "Groceries", emoji: "🛒", color: "#22c55e" },
  transport: { label: "Transport", emoji: "🚗", color: "#0ea5e9" },
  shopping: { label: "Shopping", emoji: "🛍️", color: "#a855f7" },
  bills: { label: "Bills", emoji: "🧾", color: "#64748b" },
  travel: { label: "Travel", emoji: "✈️", color: "#14b8a6" },
  other: { label: "Other", emoji: "💸", color: "#eab308" },
  settle_up: { label: "Settle up", emoji: "🤝", color: "#10b981" },
};

export type Expense = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  paid_by: string | null;
  note: string | null;
  spent_on: string;
  date_id: string | null;
  created_at: string;
};

export async function fetchExpensesForMonth(sb: SupabaseClient, month: string, nextMonth: string) {
  const { data, error } = await sb
    .from("expenses")
    .select("id, amount, category, paid_by, note, spent_on, date_id, created_at")
    .gte("spent_on", `${month}-01`)
    .lt("spent_on", `${nextMonth}-01`)
    .order("spent_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Expense[]).map((e) => ({ ...e, amount: Number(e.amount) }));
}

/** Net balance from my point of view: positive = partner owes me. */
export type BalanceRow = { user_id: string; credit: number };

/** Raw per-person credits; doesn't need to know who "me" is, so it can run in parallel. */
export async function fetchBalanceRows(sb: SupabaseClient) {
  const { data, error } = await sb.rpc("expense_balance");
  if (error) throw error;
  return (data ?? []) as BalanceRow[];
}

export function netBalance(rows: BalanceRow[], myId: string) {
  let net = 0;
  for (const row of rows) net += (row.user_id === myId ? 1 : -1) * Number(row.credit);
  return Math.round(net * 100) / 100;
}

export async function fetchBalance(sb: SupabaseClient, myId: string) {
  return netBalance(await fetchBalanceRows(sb), myId);
}

export function monthSpend(expenses: Pick<Expense, "amount" | "category">[]) {
  return expenses.filter((e) => e.category !== "settle_up").reduce((s, e) => s + e.amount, 0);
}

/** "RM 1,234.50" */
export function fmtRM(n: number) {
  const s = Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}RM ${s}`;
}

/** Parses "12", "12.5", "1,234.50" → number, or null if invalid. */
export function parseAmount(s: string) {
  const n = Number(s.replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 && n < 1e8 ? Math.round(n * 100) / 100 : null;
}

// ───────────── Saved places ─────────────
export type PlaceCategory =
  | "food" | "cafe" | "dessert" | "activity" | "outdoors" | "shopping" | "staycation" | "other";
export type PlaceStatus = "want" | "been" | "fav";

export const PLACE_CATEGORIES: Record<PlaceCategory, { label: string; emoji: string }> = {
  food: { label: "Food", emoji: "🍜" },
  cafe: { label: "Café", emoji: "☕" },
  dessert: { label: "Dessert", emoji: "🍰" },
  activity: { label: "Activity", emoji: "🎳" },
  outdoors: { label: "Outdoors", emoji: "🌿" },
  shopping: { label: "Shopping", emoji: "🛍️" },
  staycation: { label: "Staycation", emoji: "🏨" },
  other: { label: "Other", emoji: "📍" },
};

export const PLACE_STATUS: Record<PlaceStatus, { label: string; short: string; color: string }> = {
  want: { label: "Want to go", short: "Want", color: "#c8324a" },
  been: { label: "Been there", short: "Been", color: "#0ea5e9" },
  fav: { label: "Favourite", short: "Fav", color: "#f59e0b" },
};

export type Place = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  place_id: string | null;
  category: PlaceCategory;
  status: PlaceStatus;
  notes: string | null;
  created_at: string;
};

export async function fetchPlaces(sb: SupabaseClient) {
  const { data, error } = await sb.from("places").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as Place[];
}

export async function fetchPlace(sb: SupabaseClient, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await sb.from("places").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Place | null;
}

// ───────────── Special days + home ─────────────
export async function fetchEvents(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("events")
    .select("id, title, event_date, kind, recurring_yearly")
    .order("event_date");
  if (error) throw error;
  return data as SpecialEvent[];
}

export type TodoWithList = Todo & { todo_lists: { name: string } | null };

/** Open to-dos due today or overdue (before `endISO`), oldest first. */
export async function fetchDueTodos(sb: SupabaseClient, endISO: string) {
  const { data, error } = await sb
    .from("todos")
    .select("*, todo_lists(name)")
    .eq("done", false)
    .lt("due_at", endISO)
    .order("due_at")
    .limit(8);
  if (error) throw error;
  return data as TodoWithList[];
}

// ───────────── Memories ─────────────
export const PHOTO_BUCKET = "date-photos";

export type Photo = {
  id: string;
  date_id: string;
  storage_path: string;
  thumb_path: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
  /** Signed URLs (valid ~1 hour). */
  url?: string;
  thumbUrl?: string;
};

const PHOTO_COLS = "id, date_id, storage_path, thumb_path, caption, uploaded_by, created_at";

/** Adds signed URLs to photos (one batched request). */
export async function signPhotos(sb: SupabaseClient, photos: Photo[], full = true): Promise<Photo[]> {
  const paths = new Set<string>();
  for (const p of photos) {
    if (full) paths.add(p.storage_path);
    paths.add(p.thumb_path ?? p.storage_path);
  }
  if (paths.size === 0) return photos;
  const { data } = await sb.storage.from(PHOTO_BUCKET).createSignedUrls([...paths], 60 * 60);
  const urls = new Map<string | null, string>();
  for (const d of data ?? []) if (d.signedUrl) urls.set(d.path, d.signedUrl);
  return photos.map((p) => ({
    ...p,
    url: urls.get(p.storage_path),
    thumbUrl: urls.get(p.thumb_path ?? p.storage_path),
  }));
}

export async function fetchDatePhotos(sb: SupabaseClient, dateId: string) {
  const { data, error } = await sb.from("date_photos").select(PHOTO_COLS).eq("date_id", dateId).order("created_at");
  if (error) throw error;
  return signPhotos(sb, data as Photo[]);
}

export type Memory = DateRow & { date_photos: Photo[] };

/** Past dates, newest first, with signed thumbnail URLs. */
export async function fetchMemories(sb: SupabaseClient, beforeISO: string) {
  const { data, error } = await sb
    .from("dates")
    .select(`*, date_photos(${PHOTO_COLS})`)
    .lt("starts_at", beforeISO)
    .order("starts_at", { ascending: false })
    .order("created_at", { referencedTable: "date_photos" })
    .limit(300);
  if (error) throw error;
  const memories = data as Memory[];
  const signed = await signPhotos(sb, memories.flatMap((m) => m.date_photos), false);
  const byId = new Map(signed.map((p) => [p.id, p]));
  return memories.map((m) => ({ ...m, date_photos: m.date_photos.map((p) => byId.get(p.id) ?? p) }));
}

// ───────────── Navigation links ─────────────
export const wazeUrl = (lat: number, lng: number) =>
  `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
