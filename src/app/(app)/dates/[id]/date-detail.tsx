"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { CATEGORIES, fetchDate, fmtRM, googleMapsUrl, wazeUrl, type DateRow, type Photo } from "@/lib/data";
import { deletePhotos } from "@/lib/photos";
import { DateMemories } from "./date-memories";
import { dayKey, fmtDayLong, fmtTime } from "@/lib/time";
import { PageHeader, EmptyState } from "@/components/page-header";
import { LazyMap } from "@/components/map";
import { card, errorText } from "@/components/ui";

export function DateDetail({
  initial,
  names,
  photos,
  coupleId,
  nowISO,
}: {
  initial: DateRow;
  names: Record<string, string>;
  photos: Photo[];
  coupleId: string;
  nowISO: string;
}) {
  const router = useRouter();
  const { data: date } = useLive<DateRow | null>(
    initial,
    () => fetchDate(createClient(), initial.id),
    [{ table: "dates", filter: `id=eq.${initial.id}` }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!date) {
    return (
      <>
        <PageHeader title="Date" back="/calendar" />
        <EmptyState title="This date was deleted" body="Your partner may have removed it." />
      </>
    );
  }

  const cat = CATEGORIES[date.category];
  const day = dayKey(date.starts_at);
  const hasPlace = date.lat != null && date.lng != null;

  async function remove() {
    if (!window.confirm(`Delete "${date!.title}" and its photos? This can't be undone.`)) return;
    setBusy(true);
    const sb = createClient();
    try {
      // Storage files aren't removed by the database cascade, so delete them first.
      const { data: ph } = await sb.from("date_photos").select("id, storage_path, thumb_path").eq("date_id", date!.id);
      await deletePhotos(sb, ph ?? []);
    } catch (e) {
      setBusy(false);
      return setError(e instanceof Error ? e.message : "Couldn't delete photos");
    }
    const { error } = await sb.from("dates").delete().eq("id", date!.id);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    router.replace(`/calendar?d=${day}`);
  }

  const linkBtn =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-full border border-border bg-surface text-sm font-semibold";

  return (
    <>
      <PageHeader
        title=""
        back={`/calendar?d=${day}`}
        action={
          <Link href={`/dates/${date.id}/edit`} className="rounded-full px-3 py-1.5 font-medium text-brand">
            Edit
          </Link>
        }
      />
      <div className="space-y-4 px-4">
        <div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: `${cat.color}22`, color: cat.color }}
          >
            {cat.emoji} {cat.label}
          </span>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{date.title}</h1>
          <p className="mt-1 text-muted">
            {fmtDayLong(day)} · {fmtTime(date.starts_at)}
          </p>
        </div>

        {hasPlace && (
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            <div className="h-44">
              <LazyMap
                center={[date.lat!, date.lng!]}
                zoom={16}
                interactive={false}
                fit
                pins={[{ id: date.id, lat: date.lat!, lng: date.lng!, color: cat.color }]}
              />
            </div>
            <div className="p-4">
              <p className="font-medium">{date.place_name}</p>
              {date.address && <p className="mt-0.5 text-sm text-muted">{date.address}</p>}
              <div className="mt-3 flex gap-2">
                <a href={wazeUrl(date.lat!, date.lng!)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  Open in Waze
                </a>
                <a href={googleMapsUrl(date.lat!, date.lng!)} target="_blank" rel="noopener noreferrer" className={linkBtn}>
                  Google Maps
                </a>
              </div>
            </div>
          </section>
        )}

        {date.starts_at <= nowISO && (
          <DateMemories date={date} initialPhotos={photos} coupleId={coupleId} names={names} />
        )}

        {date.notes && (
          <section className={card}>
            <h2 className="text-sm font-medium text-muted">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap">{date.notes}</p>
          </section>
        )}

        {(date.est_cost != null || date.actual_cost != null) && (
          <section className={`${card} grid grid-cols-2 gap-3`}>
            <div>
              <h2 className="text-sm text-muted">Estimated</h2>
              <p className="mt-0.5 font-semibold tabular-nums">
                {date.est_cost != null ? fmtRM(Number(date.est_cost)) : "—"}
              </p>
            </div>
            <div>
              <h2 className="text-sm text-muted">Actual</h2>
              <p className="mt-0.5 font-semibold tabular-nums">
                {date.actual_cost != null ? fmtRM(Number(date.actual_cost)) : "—"}
              </p>
              {date.actual_cost != null && (
                <Link href="/budget" className="text-xs font-medium text-brand">
                  In Budget →
                </Link>
              )}
            </div>
          </section>
        )}

        {date.created_by && names[date.created_by] && (
          <p className="text-sm text-muted">Added by {names[date.created_by]}</p>
        )}

        {error && <p className={errorText}>{error}</p>}
        <button
          onClick={remove}
          disabled={busy}
          className="w-full py-3 text-sm font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
        >
          Delete date
        </button>
      </div>
    </>
  );
}
