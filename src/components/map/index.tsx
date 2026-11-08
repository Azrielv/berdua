"use client";

import dynamic from "next/dynamic";

export type { MapPin, LeafletMapProps } from "./leaflet-map";
export { KL_CENTER } from "./constants";

/** Leaflet touches `window`, so it only ever loads in the browser. */
export const LazyMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-border/60" />,
});
