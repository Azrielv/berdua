"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, parseAmount, type DateCategory, type DateRow } from "@/lib/data";
import { dayKey, klToISO, timeKey } from "@/lib/time";
import type { PlaceResult } from "@/lib/geo";
import { LocationField } from "@/components/location-picker";
import { btn, errorText, input } from "@/components/ui";

export function DateForm({
  date,
  defaultDay,
  initialTitle,
  initialLocation,
}: {
  date?: DateRow;
  defaultDay: string;
  initialTitle?: string;
  initialLocation?: PlaceResult;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(date?.title ?? initialTitle ?? "");
  const [day, setDay] = useState(date ? dayKey(date.starts_at) : defaultDay);
  const [time, setTime] = useState(date ? timeKey(date.starts_at) : "19:00");
  const [category, setCategory] = useState<DateCategory>(date?.category ?? "date_night");
  const [notes, setNotes] = useState(date?.notes ?? "");
  const [location, setLocation] = useState<PlaceResult | null>(
    date && date.lat != null && date.lng != null
      ? {
          place_name: date.place_name ?? "Pinned location",
          address: date.address ?? "",
          lat: date.lat,
          lng: date.lng,
          place_id: date.place_id,
        }
      : (initialLocation ?? null),
  );
  const [estCost, setEstCost] = useState(date?.est_cost != null ? String(date.est_cost) : "");
  const [actualCost, setActualCost] = useState(date?.actual_cost != null ? String(date.actual_cost) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const est = estCost.trim() ? parseAmount(estCost) : null;
    const actual = actualCost.trim() ? parseAmount(actualCost) : null;
    if ((estCost.trim() && est === null) || (actualCost.trim() && actual === null)) {
      return setError("Costs must be amounts like 45 or 45.50");
    }
    setBusy(true);
    setError(null);
    const payload = {
      est_cost: est,
      actual_cost: actual,
      title: title.trim(),
      starts_at: klToISO(day, time),
      category,
      notes: notes.trim() || null,
      place_name: location?.place_name ?? null,
      address: location?.address || null,
      lat: location?.lat ?? null,
      lng: location?.lng ?? null,
      place_id: location?.place_id ?? null,
    };
    const sb = createClient();
    const res = date
      ? await sb.from("dates").update(payload).eq("id", date.id).select("id").single()
      : await sb.from("dates").insert(payload).select("id").single();
    if (res.error) {
      setBusy(false);
      return setError(res.error.message);
    }
    router.replace(`/dates/${res.data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5 px-4 pb-6">
      <label className="block">
        <span className="text-sm font-medium">What&apos;s the plan?</span>
        <input
          className={`${input} mt-1.5`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner at our favourite place"
          maxLength={120}
          required
          autoFocus={!date}
        />
      </label>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <label className="block">
          <span className="text-sm font-medium">Date</span>
          <input
            className={`${input} mt-1.5`}
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Time</span>
          <input
            className={`${input} mt-1.5 w-32`}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Category</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(Object.keys(CATEGORIES) as DateCategory[]).map((c) => {
            const on = c === category;
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setCategory(c)}
                className={`flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                  on ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
                }`}
              >
                <span aria-hidden>{CATEGORIES[c].emoji}</span>
                {CATEGORIES[c].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <span className="text-sm font-medium">Location</span>
        <div className="mt-1.5">
          <LocationField value={location} onChange={setLocation} />
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">Notes</span>
        <textarea
          className={`${input} mt-1.5 h-24 resize-none py-3`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Dress code, booking number, what to bring…"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["Estimated cost", estCost, setEstCost],
            ["Actual cost", actualCost, setActualCost],
          ] as const
        ).map(([label, value, set]) => (
          <label key={label} className="block">
            <span className="text-sm font-medium">{label}</span>
            <div className="mt-1.5 flex h-12 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 focus-within:border-brand">
              <span className="text-sm text-muted">RM</span>
              <input
                className="w-full min-w-0 bg-transparent text-base tabular-nums outline-none"
                inputMode="decimal"
                placeholder="0.00"
                value={value}
                onChange={(e) => set(e.target.value.replace(/[^\d.,]/g, ""))}
              />
            </div>
          </label>
        ))}
      </div>
      <p className="-mt-3 text-xs text-muted">The actual cost is added to Budget automatically.</p>

      {error && <p className={errorText}>{error}</p>}
      <button className={btn} disabled={busy || !title.trim() || !day || !time}>
        {busy ? "Saving…" : date ? "Save changes" : "Add date"}
      </button>
    </form>
  );
}
