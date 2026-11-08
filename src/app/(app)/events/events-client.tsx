"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { fetchEvents } from "@/lib/data";
import {
  countdownText,
  EVENT_KINDS,
  nextOccurrence,
  occurrenceLabel,
  type EventKind,
  type SpecialEvent,
} from "@/lib/events";
import { fmtDayLong, fmtDayShort } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/page-header";
import { BottomSheet } from "@/components/bottom-sheet";
import { btn, card, errorText, input } from "@/components/ui";

export function EventsClient({
  initial,
  coupleId,
  anniversary: initialAnniversary,
  today,
}: {
  initial: SpecialEvent[];
  coupleId: string;
  anniversary: string | null;
  today: string;
}) {
  const router = useRouter();
  const { data: events, reload } = useLive(initial, () => fetchEvents(createClient()), [
    { table: "events", filter: `couple_id=eq.${coupleId}` },
  ]);
  const [anniversary, setAnniversary] = useState(initialAnniversary ?? "");
  const [savedAnniversary, setSavedAnniversary] = useState(initialAnniversary ?? "");
  const [sheet, setSheet] = useState<SpecialEvent | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveAnniversary() {
    setError(null);
    const { error } = await createClient()
      .from("couples")
      .update({ anniversary: anniversary || null })
      .eq("id", coupleId);
    if (error) return setError(error.message);
    setSavedAnniversary(anniversary);
    router.refresh();
  }

  const sorted = events
    .map((e) => ({ e, o: nextOccurrence(e, today) }))
    .sort((a, b) => (a.o?.daysAway ?? 1e9) - (b.o?.daysAway ?? 1e9));

  return (
    <>
      <PageHeader title="Special days" back="/" />
      <div className="space-y-4 px-4">
        <section className={card}>
          <h2 className="font-semibold">💍 Our anniversary</h2>
          <p className="mt-0.5 text-sm text-muted">The day you got together, or married.</p>
          <div className="mt-3 flex gap-2">
            <input
              className={input}
              type="date"
              value={anniversary}
              max={today}
              onChange={(e) => setAnniversary(e.target.value)}
              aria-label="Anniversary date"
            />
            {anniversary !== savedAnniversary && (
              <button onClick={saveAnniversary} className="h-12 shrink-0 rounded-xl bg-brand px-4 font-semibold text-white">
                Save
              </button>
            )}
          </div>
          {savedAnniversary && (
            <p className="mt-2 text-sm text-muted">
              {(() => {
                const o = nextOccurrence(
                  { id: "a", title: "Anniversary", event_date: savedAnniversary, kind: "anniversary", recurring_yearly: true },
                  today,
                )!;
                const label = occurrenceLabel(o);
                if (o.daysAway === 0) return `${label} is today! 🎉`;
                if (o.daysAway === 1) return `${label} is tomorrow (${fmtDayShort(o.day)})`;
                return `${label} in ${o.daysAway} days (${fmtDayShort(o.day)})`;
              })()}
            </p>
          )}
          {error && <p className={`${errorText} mt-2`}>{error}</p>}
        </section>

        <div className="flex items-center justify-between pt-2">
          <h2 className="font-semibold">Birthdays &amp; other days</h2>
          <button onClick={() => setSheet("new")} className="text-sm font-semibold text-brand">
            + Add
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState title="Nothing yet" body="Add birthdays, the day you met, or anything worth counting down to." />
      ) : (
        <ul className="mx-4 mt-2 rounded-2xl border border-border bg-surface">
          {sorted.map(({ e, o }) => (
            <li key={e.id} className="border-b border-border last:border-0">
              <button onClick={() => setSheet(e)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className="text-2xl" aria-hidden>
                  {EVENT_KINDS[e.kind].emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o ? occurrenceLabel(o) : e.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {o ? fmtDayLong(o.day) : `${fmtDayLong(e.event_date)} · passed`}
                    {e.recurring_yearly && " · yearly"}
                  </span>
                </span>
                {o && (
                  <span className="shrink-0 text-sm font-semibold" style={{ color: EVENT_KINDS[e.kind].color }}>
                    {countdownText(o.daysAway)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheet && (
        <EventSheet
          event={sheet === "new" ? null : sheet}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function EventSheet({
  event,
  onClose,
  onSaved,
}: {
  event: SpecialEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [date, setDate] = useState(event?.event_date ?? "");
  const [kind, setKind] = useState<EventKind>(event?.kind ?? "birthday");
  const [yearly, setYearly] = useState(event?.recurring_yearly ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fields = { title: title.trim(), event_date: date, kind, recurring_yearly: yearly };
    const sb = createClient();
    const { error } = event
      ? await sb.from("events").update(fields).eq("id", event.id)
      : await sb.from("events").insert(fields);
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  async function remove() {
    if (!event || !window.confirm(`Delete "${event.title}"?`)) return;
    setBusy(true);
    const { error } = await createClient().from("events").delete().eq("id", event.id);
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  return (
    <BottomSheet title={event ? "Edit special day" : "Add a special day"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(EVENT_KINDS) as EventKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === kind}
              onClick={() => setKind(k)}
              className={`rounded-xl border px-2 py-2 text-sm font-medium ${
                k === kind ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
              }`}
            >
              <span className="block text-xl" aria-hidden>
                {EVENT_KINDS[k].emoji}
              </span>
              {EVENT_KINDS[k].label}
            </button>
          ))}
        </div>
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "birthday" ? "Aina's birthday" : kind === "anniversary" ? "First date" : "Mum's visit"}
          maxLength={80}
          required
          aria-label="Title"
        />
        <label className="block">
          <span className="text-sm font-medium">{kind === "birthday" ? "Date of birth" : "Date"}</span>
          <input className={`${input} mt-1.5`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          {kind === "birthday" && (
            <span className="mt-1 block text-xs text-muted">Include the real year to show the age they&apos;re turning.</span>
          )}
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <span className="text-sm font-medium">Repeats every year</span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--brand)]" checked={yearly} onChange={(e) => setYearly(e.target.checked)} />
        </label>
        {error && <p className={errorText}>{error}</p>}
        <button className={btn} disabled={busy || !title.trim() || !date}>
          {busy ? "Saving…" : event ? "Save" : "Add"}
        </button>
        {event && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="w-full py-2 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </form>
    </BottomSheet>
  );
}
