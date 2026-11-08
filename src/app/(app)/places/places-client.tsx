"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import {
  fetchPlaces,
  PLACE_CATEGORIES,
  PLACE_STATUS,
  type Place,
  type PlaceCategory,
  type PlaceStatus,
} from "@/lib/data";
import type { PlaceResult } from "@/lib/geo";
import { PageHeader, EmptyState } from "@/components/page-header";
import { LazyMap } from "@/components/map";
import { PickerSheet } from "@/components/location-picker";
import { PlaceSheet } from "./place-sheet";
import { Spinner } from "./spinner";

type Sheet =
  | { kind: "pick" }
  | { kind: "new"; location: PlaceResult }
  | { kind: "edit"; id: string }
  | { kind: "spin" };

const chip = (on: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
    on ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
  }`;

export function PlacesClient({ initial, coupleId }: { initial: Place[]; coupleId: string }) {
  const { data: places, reload } = useLive(initial, () => fetchPlaces(createClient()), [
    { table: "places", filter: `couple_id=eq.${coupleId}` },
  ]);
  const [status, setStatus] = useState<PlaceStatus | "all">("all");
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [sheet, setSheet] = useState<Sheet | null>(null);

  const usedCategories = (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).filter((c) =>
    places.some((p) => p.category === c),
  );
  const shown = places.filter(
    (p) => (status === "all" || p.status === status) && (category === "all" || p.category === category),
  );
  const editing = sheet?.kind === "edit" ? places.find((p) => p.id === sheet.id) : undefined;

  return (
    <>
      <PageHeader
        title="Places"
        action={
          <button
            onClick={() => setSheet({ kind: "spin" })}
            className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand"
          >
            <span aria-hidden>🎲</span> Where to?
          </button>
        }
      />

      <div className="mx-4 h-[38dvh] min-h-56 overflow-hidden rounded-2xl border border-border">
        <LazyMap
          fit
          pins={shown.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            color: PLACE_STATUS[p.status].color,
            label: p.name,
          }))}
          onPinClick={(id) => setSheet({ kind: "edit", id })}
        />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          <button className={chip(status === "all")} onClick={() => setStatus("all")}>
            All {places.length > 0 && <span className="text-muted">{places.length}</span>}
          </button>
          {(Object.keys(PLACE_STATUS) as PlaceStatus[]).map((s) => (
            <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: PLACE_STATUS[s].color }} />
              {PLACE_STATUS[s].label}
            </button>
          ))}
        </div>
        {usedCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
            <button className={chip(category === "all")} onClick={() => setCategory("all")}>
              Any type
            </button>
            {usedCategories.map((c) => (
              <button key={c} className={chip(category === c)} onClick={() => setCategory(c)}>
                {PLACE_CATEGORIES[c].emoji} {PLACE_CATEGORIES[c].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {places.length === 0 ? (
        <EmptyState title="No saved places yet" body="Tap + to save spots you both want to try." />
      ) : shown.length === 0 ? (
        <EmptyState title="Nothing matches" body="Try a different filter." />
      ) : (
        <ul className="mt-3 space-y-2 px-4">
          {shown.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => setSheet({ kind: "edit", id: p.id })}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl" aria-hidden>
                  {PLACE_CATEGORIES[p.category].emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block truncate text-sm text-muted">{p.address || PLACE_CATEGORIES[p.category].label}</span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: `${PLACE_STATUS[p.status].color}22`, color: PLACE_STATUS[p.status].color }}
                >
                  {PLACE_STATUS[p.status].short}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30">
        <div className="mx-auto flex max-w-md justify-end px-4">
          <button
            onClick={() => setSheet({ kind: "pick" })}
            aria-label="Save a place"
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-brand text-3xl font-light text-white shadow-lg transition active:scale-95"
          >
            +
          </button>
        </div>
      </div>

      {sheet?.kind === "pick" && (
        <PickerSheet
          initial={null}
          confirmLabel="Next"
          onClose={() => setSheet(null)}
          onPick={(location) => setSheet({ kind: "new", location })}
        />
      )}
      {sheet?.kind === "new" && (
        <PlaceSheet
          location={sheet.location}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            reload();
          }}
        />
      )}
      {sheet?.kind === "edit" && editing && (
        <PlaceSheet
          place={editing}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            reload();
          }}
        />
      )}
      {sheet?.kind === "spin" && (
        <Spinner places={places.filter((p) => p.status === "want")} onClose={() => setSheet(null)} />
      )}
    </>
  );
}
