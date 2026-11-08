"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PLACE_CATEGORIES, type Place, type PlaceCategory } from "@/lib/data";
import { BottomSheet } from "@/components/bottom-sheet";
import { btn, btnSecondary } from "@/components/ui";

function randomIndex(n: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % n;
}

/** "Where should we go?" — picks a random "Want to go" place. */
export function Spinner({ places, onClose }: { places: Place[]; onClose: () => void }) {
  const [category, setCategory] = useState<PlaceCategory | "all">("all");
  const [shown, setShown] = useState<Place | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const categories = (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).filter((c) =>
    places.some((p) => p.category === c),
  );
  const pool = places.filter((p) => category === "all" || p.category === category);

  function spin() {
    if (pool.length === 0) return;
    clearTimeout(timer.current);
    const winner = pool[randomIndex(pool.length)];
    setSpinning(true);
    setDone(false);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const steps = pool.length === 1 || reduceMotion ? 0 : 18;
    let i = 0;
    const tick = () => {
      if (i >= steps) {
        setShown(winner);
        setSpinning(false);
        setDone(true);
        return;
      }
      setShown(pool[(randomIndex(pool.length) + i) % pool.length]);
      i++;
      timer.current = setTimeout(tick, 50 + i * i * 1.2); // slows down like a wheel
    };
    tick();
  }

  const chip = (on: boolean) =>
    `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
      on ? "border-brand bg-brand-soft text-brand" : "border-border bg-surface"
    }`;

  return (
    <BottomSheet title="Where should we go?" onClose={onClose}>
      {places.length === 0 ? (
        <p className="pb-4 text-center text-muted">
          Save some places as <strong>Want to go</strong> first, then let fate decide.
        </p>
      ) : (
        <div className="space-y-4">
          {categories.length > 1 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
              <button
                className={chip(category === "all")}
                onClick={() => {
                  setCategory("all");
                  setDone(false);
                  setShown(null);
                }}
              >
                Anything
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  className={chip(category === c)}
                  disabled={spinning}
                  onClick={() => {
                    setCategory(c);
                    setDone(false);
                    setShown(null);
                  }}
                >
                  {PLACE_CATEGORIES[c].emoji} {PLACE_CATEGORIES[c].label}
                </button>
              ))}
            </div>
          )}

          <div
            aria-live="polite"
            className={`grid min-h-40 place-items-center rounded-3xl border-2 p-6 text-center transition ${
              done ? "border-brand bg-brand-soft" : "border-dashed border-border bg-surface"
            }`}
          >
            {shown ? (
              <div>
                <p className="text-4xl" aria-hidden>
                  {PLACE_CATEGORIES[shown.category].emoji}
                </p>
                <p className={`mt-2 text-xl font-semibold ${spinning ? "opacity-70" : ""}`}>{shown.name}</p>
                {done && shown.address && <p className="mt-1 line-clamp-2 text-sm text-muted">{shown.address}</p>}
                {done && <p className="mt-2 text-sm font-medium text-brand">It&apos;s decided! 🎉</p>}
              </div>
            ) : (
              <p className="text-muted">
                {pool.length} place{pool.length === 1 ? "" : "s"} in the hat 🎩
              </p>
            )}
          </div>

          {done && shown ? (
            <>
              <Link href={`/dates/new?place=${shown.id}`} className={btn}>
                💕 Plan a date here
              </Link>
              <button onClick={spin} className={btnSecondary}>
                Spin again
              </button>
            </>
          ) : (
            <button onClick={spin} disabled={spinning || pool.length === 0} className={btn}>
              {spinning ? "Spinning…" : "🎲 Spin"}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
