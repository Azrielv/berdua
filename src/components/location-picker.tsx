"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LMap } from "leaflet";
import { LazyMap, KL_CENTER } from "@/components/map";
import { reverseGeocode, searchPlaces, type PlaceResult } from "@/lib/geo";
import { btn, errorText, input } from "@/components/ui";

/** Form field: shows the chosen place, opens a full-screen map picker. */
export function LocationField({
  value,
  onChange,
}: {
  value: PlaceResult | null;
  onChange: (v: PlaceResult | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
          <span className="mt-0.5 text-xl" aria-hidden>📍</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{value.place_name}</p>
            {value.address && <p className="line-clamp-2 text-sm text-muted">{value.address}</p>}
            <div className="mt-2 flex gap-4 text-sm font-medium">
              <button type="button" className="text-brand" onClick={() => setOpen(true)}>
                Change
              </button>
              <button type="button" className="text-muted" onClick={() => onChange(null)}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 text-left text-muted"
        >
          <span aria-hidden>📍</span> Add a location
        </button>
      )}
      {open && (
        <PickerSheet
          initial={value}
          onClose={() => setOpen(false)}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

export function PickerSheet({
  initial,
  onClose,
  onPick,
  confirmLabel = "Use this location",
}: {
  initial: PlaceResult | null;
  onClose: () => void;
  onPick: (v: PlaceResult) => void;
  confirmLabel?: string;
}) {
  const mapRef = useRef<LMap | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [candidate, setCandidate] = useState<PlaceResult | null>(initial);
  const [resolving, setResolving] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tapAbort = useRef<AbortController | null>(null);

  // Lock page scroll behind the sheet; close on Escape.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Debounced search (Nominatim allows 1 req/s).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const c = mapRef.current?.getCenter();
        setResults(await searchPlaces(q, c && { lat: c.lat, lng: c.lng }, ctrl.signal));
      } catch (e) {
        if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!ctrl.signal.aborted) setSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  function choose(r: PlaceResult) {
    setCandidate(r);
    setResults(null);
    setQuery("");
    mapRef.current?.flyTo([r.lat, r.lng], 17, { duration: 0.6 });
  }

  async function dropPin(lat: number, lng: number) {
    setResults(null);
    setCandidate({ place_name: "Dropped pin", address: "", lat, lng, place_id: null });
    tapAbort.current?.abort();
    const ctrl = new AbortController();
    tapAbort.current = ctrl;
    setResolving(true);
    try {
      const r = await reverseGeocode(lat, lng, ctrl.signal);
      if (r) setCandidate((c) => (c && c.lat === lat && c.lng === lng ? { ...r, place_id: null } : c));
    } catch {
      // keep "Dropped pin"; the user can name it
    } finally {
      if (!ctrl.signal.aborted) setResolving(false);
    }
  }

  function locate() {
    if (!("geolocation" in navigator)) return setError("This device can't share its location.");
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const ll: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(ll);
        mapRef.current?.flyTo(ll, 16, { duration: 0.6 });
      },
      (err) => {
        setLocating(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. Allow it in your browser settings."
            : "Couldn't get your location. Try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  const showResults = results !== null && query.trim().length >= 3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pick a location"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="mx-auto flex w-full max-w-md items-center gap-2 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-2xl text-muted"
        >
          ×
        </button>
        <div className="relative flex-1">
          <input
            className={`${input} pr-10`}
            type="search"
            enterKeyHint="search"
            placeholder="Search a place, e.g. Pavilion KL"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {searching && (
            <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          )}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-md flex-1">
        <LazyMap
          center={initial ? [initial.lat, initial.lng] : KL_CENTER}
          zoom={initial ? 16 : 12}
          pins={candidate ? [{ id: "c", lat: candidate.lat, lng: candidate.lng }] : []}
          userLocation={userLoc}
          onMapClick={dropPin}
          onReady={(m) => (mapRef.current = m)}
        />

        {showResults && (
          <ul className="absolute inset-x-3 top-2 z-10 max-h-[60%] overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
            {results.length === 0 && !searching && (
              <li className="p-4 text-sm text-muted">No matches. Try another name, or tap the map.</li>
            )}
            {results.map((r, i) => (
              <li key={`${r.place_id}-${i}`} className="border-b border-border last:border-0">
                <button type="button" onClick={() => choose(r)} className="w-full px-4 py-3 text-left">
                  <p className="truncate font-medium">{r.place_name}</p>
                  <p className="truncate text-sm text-muted">{r.address}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="absolute bottom-4 right-3 z-10 flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold shadow-lg disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
          </svg>
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div className="mx-auto w-full max-w-md space-y-3 border-t border-border bg-surface px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
        {error && <p className={errorText}>{error}</p>}
        {candidate ? (
          <>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {resolving ? "Finding address…" : "Place name"}
              </span>
              <input
                className={`${input} mt-1`}
                value={candidate.place_name}
                maxLength={200}
                onChange={(e) => setCandidate({ ...candidate, place_name: e.target.value })}
              />
            </label>
            {candidate.address && <p className="line-clamp-2 text-sm text-muted">{candidate.address}</p>}
            <button
              type="button"
              className={btn}
              disabled={!candidate.place_name.trim()}
              onClick={() => onPick({ ...candidate, place_name: candidate.place_name.trim() })}
            >
              {confirmLabel}
            </button>
          </>
        ) : (
          <p className="py-3 text-center text-sm text-muted">Search for a place, or tap the map to drop a pin.</p>
        )}
      </div>
    </div>
  );
}
