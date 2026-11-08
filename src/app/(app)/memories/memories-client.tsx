"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { CATEGORIES, fetchMemories, type Memory } from "@/lib/data";
import { dayKey, fmtDayShort, fmtMonth } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/page-header";
import { LazyMap } from "@/components/map";
import { BottomSheet } from "@/components/bottom-sheet";
import { Hearts } from "@/components/hearts";
import { btn } from "@/components/ui";

export function MemoriesClient({
  initial,
  coupleId,
  nowISO,
}: {
  initial: Memory[];
  coupleId: string;
  nowISO: string;
}) {
  const { data: memories } = useLive(initial, () => fetchMemories(createClient(), nowISO), [
    { table: "dates", filter: `couple_id=eq.${coupleId}` },
    { table: "date_photos", filter: `couple_id=eq.${coupleId}` },
  ]);
  const [view, setView] = useState<"timeline" | "map">("timeline");
  const [open, setOpen] = useState<string | null>(null);

  const mapped = memories.filter((m) => m.lat != null && m.lng != null);
  const photoCount = memories.reduce((n, m) => n + m.date_photos.length, 0);
  const selected = memories.find((m) => m.id === open);

  const byMonth = new Map<string, Memory[]>();
  for (const m of memories) {
    const k = dayKey(m.starts_at).slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) ?? []), m]);
  }

  const tab = (v: typeof view) =>
    `flex-1 rounded-full py-2 text-sm font-semibold transition ${view === v ? "bg-surface shadow-sm" : "text-muted"}`;

  return (
    <>
      <PageHeader title="Memories" back="/" />
      <div className="px-4">
        <p className="text-sm text-muted">
          {memories.length} date{memories.length === 1 ? "" : "s"} · {photoCount} photo{photoCount === 1 ? "" : "s"}
        </p>
        <div className="mt-3 flex rounded-full bg-border/60 p-1" role="tablist">
          <button role="tab" aria-selected={view === "timeline"} className={tab("timeline")} onClick={() => setView("timeline")}>
            Timeline
          </button>
          <button role="tab" aria-selected={view === "map"} className={tab("map")} onClick={() => setView("map")}>
            Map
          </button>
        </div>
      </div>

      {memories.length === 0 ? (
        <EmptyState title="No memories yet" body="After a date, add photos and a note on its page. They'll show up here." />
      ) : view === "map" ? (
        <div className="mx-4 mt-4">
          <div className="h-[60dvh] overflow-hidden rounded-2xl border border-border">
            <LazyMap
              fit
              pins={mapped.map((m) => ({
                id: m.id,
                lat: m.lat!,
                lng: m.lng!,
                color: CATEGORIES[m.category].color,
                label: m.title,
              }))}
              onPinClick={setOpen}
            />
          </div>
          {mapped.length < memories.length && (
            <p className="mt-2 text-sm text-muted">
              {memories.length - mapped.length} date{memories.length - mapped.length === 1 ? " has" : "s have"} no
              location, so {memories.length - mapped.length === 1 ? "it's" : "they're"} only on the timeline.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-6 px-4">
          {[...byMonth.entries()].map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{fmtMonth(month)}</h2>
              <ul className="space-y-3">
                {items.map((m) => (
                  <li key={m.id}>
                    <MemoryCard m={m} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {selected && (
        <BottomSheet title={selected.title} onClose={() => setOpen(null)}>
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {fmtDayShort(dayKey(selected.starts_at))}
              {selected.place_name && ` · ${selected.place_name}`}
            </p>
            <Hearts value={selected.rating} />
            {selected.memory && <p className="whitespace-pre-wrap">{selected.memory}</p>}
            {selected.date_photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {selected.date_photos.slice(0, 9).map((p) => (
                  <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-border">
                    {p.thumbUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs
                      <img src={p.thumbUrl} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href={`/dates/${selected.id}`} className={btn}>
              Open memory
            </Link>
          </div>
        </BottomSheet>
      )}
    </>
  );
}

function MemoryCard({ m }: { m: Memory }) {
  const cover = m.date_photos[0];
  const extra = m.date_photos.length - 1;
  return (
    <Link href={`/dates/${m.id}`} className="block overflow-hidden rounded-2xl border border-border bg-surface">
      {cover?.thumbUrl && (
        <div className="relative aspect-[16/9] bg-border">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs */}
          <img src={cover.thumbUrl} alt={cover.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
          {extra > 0 && (
            <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              +{extra}
            </span>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold">
            <span aria-hidden>{CATEGORIES[m.category].emoji}</span> {m.title}
          </p>
          <span className="shrink-0 text-sm">
            <Hearts value={m.rating} />
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {fmtDayShort(dayKey(m.starts_at))}
          {m.place_name && ` · ${m.place_name}`}
        </p>
        {m.memory ? (
          <p className="mt-2 line-clamp-3 text-sm">{m.memory}</p>
        ) : (
          !cover && <p className="mt-2 text-sm text-muted">Tap to add photos and a note.</p>
        )}
      </div>
    </Link>
  );
}
