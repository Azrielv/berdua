"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLive } from "@/lib/use-live";
import { fetchDatePhotos, type DateRow, type Photo } from "@/lib/data";
import { deletePhotos, uploadPhoto } from "@/lib/photos";
import { Hearts } from "@/components/hearts";
import { card, errorText, input } from "@/components/ui";

/** After a date: rating, a short memory note, and shared photos. */
export function DateMemories({
  date,
  initialPhotos,
  coupleId,
  names,
}: {
  date: DateRow;
  initialPhotos: Photo[];
  coupleId: string;
  names: Record<string, string>;
}) {
  const { data: photos, reload } = useLive(initialPhotos, () => fetchDatePhotos(createClient(), date.id), [
    { table: "date_photos", filter: `date_id=eq.${date.id}` },
  ]);
  const [rating, setRating] = useState(date.rating);
  const [memory, setMemory] = useState(date.memory ?? "");
  const [savedMemory, setSavedMemory] = useState(date.memory ?? "");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Follow partner's edits unless I'm mid-edit.
  const [lastRemote, setLastRemote] = useState({ rating: date.rating, memory: date.memory });
  if (lastRemote.rating !== date.rating || lastRemote.memory !== date.memory) {
    setLastRemote({ rating: date.rating, memory: date.memory });
    setRating(date.rating);
    if (memory === savedMemory) {
      setMemory(date.memory ?? "");
      setSavedMemory(date.memory ?? "");
    }
  }

  async function rate(v: number | null) {
    setRating(v);
    const { error } = await createClient().from("dates").update({ rating: v }).eq("id", date.id);
    if (error) setError(error.message);
  }

  async function saveMemory() {
    const value = memory.trim();
    const { error } = await createClient().from("dates").update({ memory: value || null }).eq("id", date.id);
    if (error) return setError(error.message);
    setSavedMemory(value);
    setMemory(value);
  }

  async function onFiles(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (fileRef.current) fileRef.current.value = "";
    if (files.length === 0) return;
    setError(null);
    setUploading({ done: 0, total: files.length });
    const sb = createClient();
    const failed: string[] = [];
    for (const [i, f] of files.entries()) {
      try {
        await uploadPhoto(sb, coupleId, date.id, f);
      } catch (e) {
        failed.push(e instanceof Error ? e.message : f.name);
      }
      setUploading({ done: i + 1, total: files.length });
    }
    setUploading(null);
    if (failed.length) setError(`Some photos didn't upload: ${failed.join("; ")}`);
    reload();
  }

  return (
    <section className={`${card} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Memories</h2>
        <Hearts value={rating} onChange={rate} />
      </div>

      <div>
        <textarea
          className={`${input} h-20 resize-none py-3`}
          value={memory}
          onChange={(e) => setMemory(e.target.value)}
          maxLength={2000}
          placeholder="How was it? A little note to remember it by…"
          aria-label="Memory note"
        />
        {memory.trim() !== savedMemory && (
          <button onClick={saveMemory} className="mt-2 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white">
            Save note
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setViewer(i)}
            className="aspect-square overflow-hidden rounded-lg bg-border"
            aria-label={p.caption ? `Photo: ${p.caption}` : `Photo ${i + 1}`}
          >
            {p.thumbUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs
              <img src={p.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!!uploading}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-sm text-muted disabled:opacity-60"
        >
          {uploading ? (
            <>
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              {uploading.done}/{uploading.total}
            </>
          ) : (
            <>
              <span className="text-2xl leading-none">+</span>
              Add photos
            </>
          )}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className={errorText}>{error}</p>}

      {viewer !== null && photos[viewer] && (
        <PhotoViewer
          photos={photos}
          index={viewer}
          names={names}
          onIndex={setViewer}
          onClose={() => setViewer(null)}
          onChanged={reload}
        />
      )}
    </section>
  );
}

function PhotoViewer({
  photos,
  index,
  names,
  onIndex,
  onClose,
  onChanged,
}: {
  photos: Photo[];
  index: number;
  names: Record<string, string>;
  onIndex: (i: number) => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const p = photos[index];
  const [caption, setCaption] = useState(p.caption ?? "");
  const [shownId, setShownId] = useState(p.id);
  if (shownId !== p.id) {
    setShownId(p.id);
    setCaption(p.caption ?? "");
  }
  const touchX = useRef<number | null>(null);
  const prev = () => index > 0 && onIndex(index - 1);
  const next = () => index < photos.length - 1 && onIndex(index + 1);
  const keyRef = useRef({ prev, next, onClose });
  useEffect(() => {
    keyRef.current = { prev, next, onClose };
  });

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") keyRef.current.onClose();
      if (e.key === "ArrowLeft") keyRef.current.prev();
      if (e.key === "ArrowRight") keyRef.current.next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  async function saveCaption() {
    if ((p.caption ?? "") === caption.trim()) return;
    await createClient().from("date_photos").update({ caption: caption.trim() || null }).eq("id", p.id);
    onChanged();
  }

  async function remove() {
    if (!window.confirm("Delete this photo?")) return;
    await deletePhotos(createClient(), [p]);
    if (photos.length <= 1) onClose();
    else if (index === photos.length - 1) onIndex(index - 1);
    onChanged();
  }

  const navBtn = "absolute top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center rounded-full bg-black/40 text-2xl text-white";

  return (
    <div role="dialog" aria-modal="true" aria-label="Photo" className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] text-white">
        <button onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center text-3xl">
          ×
        </button>
        <span className="text-sm opacity-80">
          {index + 1} / {photos.length}
        </span>
        <button onClick={remove} className="px-3 py-2 text-sm font-medium text-red-400">
          Delete
        </button>
      </div>
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (dx > 50) prev();
          if (dx < -50) next();
          touchX.current = null;
        }}
      >
        {p.url && (
          // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs
          <img src={p.url} alt={p.caption ?? ""} className="max-h-full max-w-full object-contain" />
        )}
        {index > 0 && (
          <button onClick={prev} aria-label="Previous photo" className={`${navBtn} left-2`}>
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button onClick={next} aria-label="Next photo" className={`${navBtn} right-2`}>
            ›
          </button>
        )}
      </div>
      <div className="mx-auto w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        <input
          className="h-11 w-full rounded-xl bg-white/10 px-4 text-white outline-none placeholder:text-white/50"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={saveCaption}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={300}
          placeholder="Add a caption…"
          aria-label="Caption"
        />
        {p.uploaded_by && names[p.uploaded_by] && (
          <p className="mt-1.5 text-xs text-white/60">Added by {names[p.uploaded_by]}</p>
        )}
      </div>
    </div>
  );
}
