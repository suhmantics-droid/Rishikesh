"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/data";
import { formatDay, formatTime } from "@/lib/dates";
import { category, SITE } from "@/lib/site";
import { escapeHtml } from "@/lib/util";

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function pinHtml(color: string, count: number, active = false) {
  return `<div style="position:relative;transform:translate(-50%,-100%);width:34px;height:44px">
    <svg viewBox="0 0 34 44" width="34" height="44" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
      <path d="M17 1C8.2 1 1 8 1 16.6 1 28.5 17 43 17 43s16-14.5 16-26.4C33 8 25.8 1 17 1z" fill="${color}" stroke="${active ? "#1d1b16" : "#fff"}" stroke-width="2"/>
    </svg>
    <span style="position:absolute;top:7px;left:0;width:34px;text-align:center;color:#fff;font:800 13px/18px system-ui">${count}</span>
  </div>`;
}

/** Leaflet map of venues with something on. Each pin lists that venue's flyers. */
export default function MapView({
  pins,
  today,
  className = "",
  pick,
  onPick,
  picked,
}: {
  pins: MapPin[];
  today: string;
  className?: string;
  /** Location-picker mode: click the map to choose a point. */
  pick?: boolean;
  onPick?: (lat: number, lng: number) => void;
  picked?: { lat: number; lng: number } | null;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pickRef = useRef<import("leaflet").Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: !pick ? false : true }).setView(SITE.mapCenter, SITE.mapZoom);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.on("click", (ev: import("leaflet").LeafletMouseEvent) => onPickRef.current?.(ev.latlng.lat, ev.latlng.lng));
      map.whenReady(() => setTimeout(() => map.invalidateSize(), 50));
      draw(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L: typeof import("leaflet")) {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    for (const p of pins) {
      const color = category(p.events[0]?.category ?? "other").color;
      const icon = L.divIcon({ className: "pin-marker", html: pinHtml(color, p.events.length), iconSize: [0, 0] });
      const items = p.events
        .slice(0, 6)
        .map(
          (e) => `<a href="/e/${e.slug}" style="display:block;padding:6px 0;border-top:1px solid var(--line);color:inherit;text-decoration:none">
            <div style="font-size:11px;font-weight:700;color:${category(e.category).color};text-transform:uppercase">${formatDay(e.date, today)} ${formatTime(e.start_time)}</div>
            <div style="font-weight:700">${escapeHtml(e.title)}</div></a>`,
        )
        .join("");
      const more = p.events.length > 6 ? `<a href="/v/${p.slug}" style="font-size:12px">+${p.events.length - 6} more</a>` : "";
      L.marker([p.lat, p.lng], { icon })
        .bindPopup(
          `<div style="min-width:200px;max-width:240px"><a href="/v/${p.slug}" style="font-weight:800;font-size:15px;color:inherit">${escapeHtml(p.name)}</a>${items}${more}</div>`,
        )
        .addTo(layer);
    }
    if (picked) {
      pickRef.current?.remove();
      pickRef.current = L.marker([picked.lat, picked.lng], {
        icon: L.divIcon({ className: "pin-marker", html: pinHtml("#e8672a", 1, true).replace(">1<", ">★<"), iconSize: [0, 0] }),
      }).addTo(map);
    }
    if (!pick && pins.length > 1) {
      map.fitBounds(L.latLngBounds(pins.map((p) => [p.lat, p.lng])).pad(0.25), { maxZoom: 16 });
    } else if (!pick && pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 16);
    } else if (pick && picked && !map.getBounds().contains([picked.lat, picked.lng])) {
      map.setView([picked.lat, picked.lng], 16);
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((m) => draw(m.default));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, picked]);

  return <div ref={el} className={`z-0 h-full w-full ${className}`} role="region" aria-label="Map of events" />;
}
