"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  googleMapsUrl,
  PLACE_CATEGORIES,
  PLACE_STATUS,
  wazeUrl,
  type Place,
  type PlaceCategory,
  type PlaceStatus,
} from "@/lib/data";
import type { PlaceResult } from "@/lib/geo";
import { BottomSheet } from "@/components/bottom-sheet";
import { btn, errorText, input } from "@/components/ui";

/** Create (pass `location`) or view/edit (pass `place`) a saved place. */
export function PlaceSheet({
  place,
  location,
  onClose,
  onSaved,
}: {
  place?: Place;
  location?: PlaceResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(place?.name ?? location?.place_name ?? "");
  const [category, setCategory] = useState<PlaceCategory>(place?.category ?? "food");
  const [status, setStatus] = useState<PlaceStatus>(place?.status ?? "want");
  const [notes, setNotes] = useState(place?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lat = place?.lat ?? location!.lat;
  const lng = place?.lng ?? location!.lng;
  const address = place?.address ?? location?.address ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fields = { name: name.trim(), category, status, notes: notes.trim() || null };
    const sb = createClient();
    const { error } = place
      ? await sb.from("places").update(fields).eq("id", place.id)
      : await sb.from("places").insert({
          ...fields,
          address: location!.address || null,
          lat,
          lng,
          place_id: location!.place_id,
        });
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  async function remove() {
    if (!place || !window.confirm(`Remove "${place.name}" from your places?`)) return;
    setBusy(true);
    const { error } = await createClient().from("places").delete().eq("id", place.id);
    setBusy(false);
    if (error) return setError(error.message);
    onSaved();
  }

  const pill = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium ${
      on ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
    }`;
  const linkBtn =
    "flex h-10 flex-1 items-center justify-center rounded-full border border-border bg-surface text-sm font-semibold";

  return (
    <BottomSheet title={place ? place.name : "Save a place"} onClose={onClose}>
      <form onSubmit={save} className="space-y-4">
        {place && (
          <>
            <Link href={`/dates/new?place=${place.id}`} className={btn}>
              💕 Plan a date here
            </Link>
            <div className="flex gap-2">
              <a href={wazeUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                Waze
              </a>
              <a href={googleMapsUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                Google Maps
              </a>
            </div>
          </>
        )}

        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input
            className={`${input} mt-1.5`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
            required
          />
          {address && <span className="mt-1 block text-sm text-muted">{address}</span>}
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Status</legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PLACE_STATUS) as PlaceStatus[]).map((s) => (
              <button key={s} type="button" aria-pressed={s === status} onClick={() => setStatus(s)} className={pill(s === status)}>
                {PLACE_STATUS[s].label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Type</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).map((c) => (
              <button key={c} type="button" aria-pressed={c === category} onClick={() => setCategory(c)} className={pill(c === category)}>
                {PLACE_CATEGORIES[c].emoji} {PLACE_CATEGORIES[c].label}
              </button>
            ))}
          </div>
        </fieldset>

        <textarea
          className={`${input} h-20 resize-none py-3`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          placeholder="Notes: what to order, opening hours, who recommended it…"
          aria-label="Notes"
        />

        {error && <p className={errorText}>{error}</p>}
        <button className={place ? "h-12 w-full rounded-full border border-border bg-surface font-semibold disabled:opacity-50" : btn} disabled={busy || !name.trim()}>
          {busy ? "Saving…" : place ? "Save changes" : "Save place"}
        </button>
        {place && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="w-full py-2 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
          >
            Remove place
          </button>
        )}
      </form>
    </BottomSheet>
  );
}
