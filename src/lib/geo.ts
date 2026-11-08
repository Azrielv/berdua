// Place search + reverse geocoding via OpenStreetMap Nominatim (free, no key).
// Usage policy: max 1 request/second, so calls are serialised here and the
// search box is debounced by the caller. Swap these two functions for Google
// Places later without touching the UI.

export type PlaceResult = {
  place_name: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string | null;
};

const BASE = "https://nominatim.openstreetmap.org";
let nextSlot = 0;

async function throttle(signal?: AbortSignal) {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait) await new Promise((r) => setTimeout(r, wait));
  signal?.throwIfAborted();
}

type NominatimHit = {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  osm_type?: string;
  osm_id?: number;
};

function toResult(r: NominatimHit): PlaceResult {
  const name = r.name?.trim() || r.display_name.split(",")[0].trim();
  let address = r.display_name;
  if (address.startsWith(name)) address = address.slice(name.length).replace(/^,\s*/, "");
  return {
    place_name: name,
    address,
    lat: Number(r.lat),
    lng: Number(r.lon),
    place_id: r.osm_type && r.osm_id ? `osm:${r.osm_type}/${r.osm_id}` : null,
  };
}

export async function searchPlaces(
  query: string,
  near?: { lat: number; lng: number },
  signal?: AbortSignal,
): Promise<PlaceResult[]> {
  await throttle(signal);
  const p = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "8",
    "accept-language": "en",
  });
  if (near) {
    // Prefer (not restrict to) results around the visible map area.
    const d = 0.4;
    p.set("viewbox", [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","));
  }
  const res = await fetch(`${BASE}/search?${p}`, { signal });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return ((await res.json()) as NominatimHit[]).map(toResult);
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PlaceResult | null> {
  await throttle(signal);
  const p = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "jsonv2",
    zoom: "18",
    "accept-language": "en",
  });
  const res = await fetch(`${BASE}/reverse?${p}`, { signal });
  if (!res.ok) return null;
  const hit = (await res.json()) as NominatimHit & { error?: string };
  if (hit.error) return null;
  // Keep the exact tapped point rather than the snapped OSM feature.
  return { ...toResult(hit), lat, lng };
}
