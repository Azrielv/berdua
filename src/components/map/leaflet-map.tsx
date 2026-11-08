"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

export type MapPin = { id: string; lat: number; lng: number; color?: string; label?: string };

export type LeafletMapProps = {
  /** Initial view only; move the map later through `onReady`. */
  center?: [number, number];
  zoom?: number;
  pins?: MapPin[];
  /** Re-fit the view whenever pins change. */
  fit?: boolean;
  interactive?: boolean;
  userLocation?: [number, number] | null;
  onMapClick?: (lat: number, lng: number) => void;
  onPinClick?: (id: string) => void;
  onReady?: (map: L.Map) => void;
  className?: string;
};

import { KL_CENTER } from "./constants";

function pinIcon(color = "#e11d48") {
  return L.divIcon({
    className: "",
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    tooltipAnchor: [0, -34],
    html: `<svg width="32" height="40" viewBox="0 0 32 40" style="filter:drop-shadow(0 2px 2px rgb(0 0 0/.3))"><path d="M16 38.5S29 26 29 15.5a13 13 0 0 0-26 0C3 26 16 38.5 16 38.5z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="15.5" r="5" fill="#fff"/></svg>`,
  });
}

export default function LeafletMap({
  center = KL_CENTER,
  zoom = 13,
  pins = [],
  fit = false,
  interactive = true,
  userLocation = null,
  onMapClick,
  onPinClick,
  onReady,
  className = "",
}: LeafletMapProps) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const userLayer = useRef<L.LayerGroup | null>(null);
  const handlers = useRef({ onMapClick, onPinClick });
  useEffect(() => {
    handlers.current = { onMapClick, onPinClick };
  });

  // Create the map once.
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const map = L.map(node, {
      zoomControl: interactive,
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    pinLayer.current = L.layerGroup().addTo(map);
    userLayer.current = L.layerGroup().addTo(map);
    map.on("click", (e) => handlers.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
    mapRef.current = map;
    onReady?.(map);

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(node);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- create once; later moves go through onReady
  }, []);

  const pinsKey = JSON.stringify(pins);
  useEffect(() => {
    const map = mapRef.current;
    const layer = pinLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const list = JSON.parse(pinsKey) as MapPin[];
    for (const p of list) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(p.color), keyboard: false });
      if (p.label) {
        const span = document.createElement("span");
        span.textContent = p.label; // never inject names as HTML
        m.bindTooltip(span);
      }
      m.on("click", () => handlers.current.onPinClick?.(p.id));
      m.addTo(layer);
    }
    if (fit && list.length === 1) {
      map.setView([list[0].lat, list[0].lng], Math.max(map.getZoom(), 15));
    } else if (fit && list.length > 1) {
      map.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 16 });
    }
  }, [pinsKey, fit]);

  const userKey = userLocation?.join(",");
  useEffect(() => {
    const layer = userLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!userKey) return;
    const [lat, lng] = userKey.split(",").map(Number);
    L.circleMarker([lat, lng], {
      radius: 8,
      color: "#fff",
      weight: 3,
      fillColor: "#2563eb",
      fillOpacity: 1,
      interactive: false,
    }).addTo(layer);
  }, [userKey]);

  // `isolate` keeps Leaflet's high z-index panes below our sheets and nav.
  return <div ref={el} className={`isolate h-full w-full ${className}`} />;
}
