"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPin, Place } from "@/lib/data";
import { layoutCollage } from "@/lib/collage";
import { daysLabel, formatDay, formatTime } from "@/lib/dates";
import { category, SITE } from "@/lib/site";
import { escapeHtml, flyerUrl } from "@/lib/util";

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Item = MapPin["events"][number];

/** Card width by zoom: thumbnails grow as you zoom into a lane. */
const cardWidth = (zoom: number) => (zoom >= 18 ? 120 : zoom >= 17 ? 96 : zoom >= 16 ? 74 : zoom >= 15 ? 58 : 44);

function cardSize(e: Item, zoom: number) {
  const w = cardWidth(zoom);
  const ratio = e.flyer_w && e.flyer_h ? e.flyer_h / e.flyer_w : 1.25;
  return { w, h: Math.round(w * Math.min(1.45, Math.max(0.75, ratio))) };
}

/** A small, steady tilt per flyer, like paper pinned by hand. */
function tilt(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ((Math.abs(h) % 9) - 4) * 0.9;
}

function when(e: Item, today: string) {
  if (e.kind === "classes") return `${daysLabel(e.days) || "Weekly"} · next ${formatDay(e.date, today)} ${formatTime(e.start_time)}`.trim();
  return `${formatDay(e.date, today)} ${formatTime(e.start_time)}`.trim();
}

function cardHtml(e: Item, i: number, w: number, h: number, dx: number, dy: number, today: string, extra: number) {
  const src = flyerUrl(e.flyer, "sm");
  const isToday = e.date === today;
  const tag =
    e.kind === "classes"
      ? `<span class="fc-tag fc-classes">${escapeHtml(daysLabel(e.days) || "Weekly")}</span>`
      : isToday
        ? `<span class="fc-tag fc-today">Today</span>`
        : "";
  const body = src
    ? `<img src="${src}" alt="" loading="lazy" draggable="false">`
    : `<span class="fc-text" style="border-top:4px solid ${category(e.category).color}">${escapeHtml(e.title)}</span>`;
  return `<div class="fc-card" role="button" tabindex="0" data-i="${i}" aria-label="${escapeHtml(e.title)}, ${escapeHtml(when(e, today))}"
      style="left:${dx - w / 2}px;top:${dy - h / 2}px;width:${w}px;height:${h}px;transform:rotate(${tilt(e.slug)}deg)">
      ${body}${tag}<span class="fc-pin"></span>${extra ? `<span class="fc-more">+${extra}</span>` : ""}</div>`;
}

/** Thin line from the venue's dot to the card's edge. */
function leaderHtml(dx: number, dy: number, h: number) {
  const len = Math.hypot(dx, dy);
  if (len < h / 2 + 4) return "";
  const ex = dx * (1 - (h / 2) / len);
  const ey = dy * (1 - (h / 2) / len);
  const minX = Math.min(0, ex) - 2;
  const minY = Math.min(0, ey) - 2;
  return `<svg class="fc-line" style="left:${minX}px;top:${minY}px" width="${Math.abs(ex) + 4}" height="${Math.abs(ey) + 4}">
      <line x1="${-minX}" y1="${-minY}" x2="${ex - minX}" y2="${ey - minY}" /></svg>`;
}

function popupHtml(e: Item, venue: MapPin, today: string) {
  const src = flyerUrl(e.flyer, "sm");
  return `<a href="/e/${e.slug}" class="fc-pop">
      ${src ? `<img src="${src}" alt="">` : ""}
      <span class="fc-pop-body">
        <span class="fc-pop-cat"><i style="background:${category(e.category).color}"></i>${escapeHtml(category(e.category).short)}</span>
        <b>${escapeHtml(e.title)}</b>
        <span>${escapeHtml(when(e, today))}${e.label ? ` · ${escapeHtml(e.label)}` : ""}</span>
        <span>${escapeHtml(venue.name)} · ${escapeHtml(e.price)}</span>
        <u>See the flyer →</u>
      </span></a>`;
}

/** Everything on at one venue, for the calm dots map: titles and times, each linking to its flyer. */
function listPopupHtml(items: Item[], venue: MapPin, today: string) {
  const rows = items
    .slice(0, 5)
    .map((e) => `<a href="/e/${e.slug}" class="fc-pop-row"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(when(e, today))}</span></a>`)
    .join("");
  const more = items.length > 5 ? `<span class="fc-pop-more">+${items.length - 5} more at ${escapeHtml(venue.name)}</span>` : "";
  return `<div class="fc-pop-list"><span class="fc-pop-cat">${escapeHtml(venue.name)}</span>${rows}${more}</div>`;
}

/** A recommended place or a place to stay: name, what it is, its Google rating, and a link to its page. */
function placePopupHtml(p: Place) {
  const what = [p.recommended ? "✦ Recommended" : p.stay ? "Place to stay" : null, p.kind].filter(Boolean).join(" · ");
  const rating = p.google_rating ? `★ ${p.google_rating.toFixed(1)}${p.google_reviews ? ` · ${p.google_reviews.toLocaleString("en-IN")} Google reviews` : ""}` : "";
  return `<a href="/v/${p.slug}" class="fc-pop">
      <span class="fc-pop-body">
        <span class="fc-pop-cat">${escapeHtml(what)}</span>
        <b>${escapeHtml(p.name)}</b>
        ${rating ? `<span>${escapeHtml(rating)}</span>` : ""}
        <u>See the place →</u>
      </span></a>`;
}

/**
 * The map as a collage: every flyer pinned near its venue, spread out so none hide each other,
 * with a thread back to the exact spot. Tap a flyer for a preview.
 */
export default function MapView({
  pins,
  today,
  className = "",
  pick,
  onPick,
  picked,
  fit = true,
  insetBottom = 0,
  here = null,
  places = [],
  dots = false,
}: {
  pins: MapPin[];
  /** Recommended places and places to stay, drawn as small markers under the flyers. */
  places?: Place[];
  today: string;
  className?: string;
  /** Location-picker mode: click the map to choose a point. */
  pick?: boolean;
  onPick?: (lat: number, lng: number) => void;
  picked?: { lat: number; lng: number } | null;
  /** Zoom to fit the pins (off for a map the visitor has already panned). */
  fit?: boolean;
  /** Height of a panel covering the bottom of the map, kept clear when framing. */
  insetBottom?: number;
  /** The visitor's location, shown as a blue dot. */
  here?: { lat: number; lng: number } | null;
  /** Calm mode: a dot per venue (with a count) instead of the flyer collage; tap a dot for what's on. */
  dots?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pickRef = useRef<import("leaflet").Marker | null>(null);
  const hereRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const placesRef = useRef(places);
  placesRef.current = places;
  const dotsRef = useRef(dots);
  dotsRef.current = dots;
  const hereProp = useRef(here);
  hereProp.current = here;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: !!pick }).setView(SITE.mapCenter, SITE.mapZoom);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.on("click", (ev: import("leaflet").LeafletMouseEvent) => onPickRef.current?.(ev.latlng.lat, ev.latlng.lng));
      map.on("zoomend", () => drawCollage());
      // Keyboard: Enter on a focused flyer card opens its preview.
      el.current.addEventListener("keydown", (ev) => {
        const card = (ev.target as HTMLElement).closest?.(".fc-card") as HTMLElement | null;
        if (card && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          card.click();
        }
      });
      // Frame once the container has its real size (sticky and flex parents settle a tick late).
      map.whenReady(() =>
        setTimeout(() => {
          if (!mapRef.current) return;
          map.invalidateSize();
          frame(true);
          drawHere();
        }, 60),
      );
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Places a card for every flyer, clear of the others, at the current zoom. Returns the collage's pixel extent. */
  function drawCollage() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return null;
    layer.clearLayers();
    const zoom = map.getZoom();
    const list = pinsRef.current;
    const venues = list.map((p) => {
      const pt = map.latLngToLayerPoint([p.lat, p.lng]);
      // Events first, then today's, then by date: the most time-sensitive get the best spots.
      const items = [...p.events].sort(
        (a, b) => Number(a.kind === "classes") - Number(b.kind === "classes") || a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
      return { pin: p, items, key: p.slug, x: pt.x, y: pt.y, cards: items.map((e) => cardSize(e, zoom)) };
    });
    if (dotsRef.current) {
      for (const v of venues) {
        const n = v.items.length;
        const html = `<span class="fc-dot fc-dot-lg" style="background:${category(v.items[0]?.category ?? "other").color}"></span>${n > 1 ? `<span class="fc-count">${n}</span>` : ""}`;
        const marker = L.marker([v.pin.lat, v.pin.lng], { icon: L.divIcon({ className: "fc-marker", html, iconSize: [0, 0] }), keyboard: false, riseOnHover: true }).addTo(layer);
        marker.on("click", () =>
          L.popup({ offset: L.point(0, -8), maxWidth: 280, minWidth: 220, className: "fc-popup" })
            .setLatLng([v.pin.lat, v.pin.lng])
            .setContent(n === 1 ? popupHtml(v.items[0], v.pin, today) : listPopupHtml(v.items, v.pin, today))
            .openOn(map),
        );
      }
      drawPlaces(venues.map((v) => v.key));
      return null;
    }
    const { placed, hidden } = layoutCollage(venues);
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (const v of venues) {
      box.x0 = Math.min(box.x0, v.x);
      box.x1 = Math.max(box.x1, v.x);
      box.y0 = Math.min(box.y0, v.y);
      box.y1 = Math.max(box.y1, v.y);
    }
    for (const pl of placed) {
      const v = venues.find((x) => x.key === pl.venue)!;
      const { w, h } = v.cards[pl.card];
      box.x0 = Math.min(box.x0, v.x + pl.dx - w / 2);
      box.x1 = Math.max(box.x1, v.x + pl.dx + w / 2);
      box.y0 = Math.min(box.y0, v.y + pl.dy - h / 2 - 6);
      box.y1 = Math.max(box.y1, v.y + pl.dy + h / 2);
    }
    for (const v of venues) {
      const mine = placed.filter((pl) => pl.venue === v.key);
      const extra = hidden[v.key] ?? 0;
      let html = "";
      for (const pl of mine) html += leaderHtml(pl.dx, pl.dy, v.cards[pl.card].h);
      html += `<span class="fc-dot" style="background:${category(v.items[0]?.category ?? "other").color}"></span>`;
      for (const [n, pl] of mine.entries()) {
        const { w, h } = v.cards[pl.card];
        html += cardHtml(v.items[pl.card], pl.card, w, h, pl.dx, pl.dy, today, n === 0 ? extra : 0);
      }
      if (!mine.length && extra) html += `<span class="fc-more fc-more-dot">+${extra}</span>`;
      const marker = L.marker([v.pin.lat, v.pin.lng], {
        icon: L.divIcon({ className: "fc-marker", html, iconSize: [0, 0] }),
        keyboard: false,
        riseOnHover: true,
      }).addTo(layer);
      marker.on("click", (ev: import("leaflet").LeafletMouseEvent) => {
        const card = (ev.originalEvent.target as HTMLElement).closest?.(".fc-card") as HTMLElement | null;
        const index = card ? Number(card.dataset.i) : 0;
        const pl = mine.find((m) => m.card === index) ?? mine[0];
        const item = v.items[index] ?? v.items[0];
        if (!item) return;
        const h = pl ? v.cards[pl.card].h : 0;
        L.popup({ offset: L.point(pl?.dx ?? 0, (pl?.dy ?? 0) - h / 2 + 4), maxWidth: 280, minWidth: 220, className: "fc-popup" })
          .setLatLng([v.pin.lat, v.pin.lng])
          .setContent(popupHtml(item, v.pin, today))
          .openOn(map);
      });
    }
    drawPlaces(venues.map((v) => v.key));
    return venues.length ? box : null;
  }

  /** Places (✦ recommended, 🛏 stays), unless a flyer there already marks the spot. */
  function drawPlaces(taken: string[]) {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    for (const p of placesRef.current) {
      if (taken.includes(p.slug)) continue;
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "fc-marker",
          html: `<span class="fc-place ${p.recommended ? "fc-place-rec" : "fc-place-stay"}" title="${escapeHtml(p.name)}">${p.recommended ? "✦" : "🛏"}</span>`,
          iconSize: [0, 0],
        }),
        keyboard: false,
      }).addTo(layer);
      marker.on("click", () =>
        L.popup({ offset: L.point(0, -8), maxWidth: 240, minWidth: 180, className: "fc-popup" }).setLatLng([p.lat, p.lng]).setContent(placePopupHtml(p)).openOn(map),
      );
    }
  }

  /** Re-draws for new pins and, unless told not to, frames them. */
  function frame(initial = false) {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    const list = pinsRef.current;
    if (picked) {
      pickRef.current?.remove();
      pickRef.current = L.marker([picked.lat, picked.lng], {
        icon: L.divIcon({ className: "fc-marker", html: `<span class="fc-dot fc-dot-picked"></span>`, iconSize: [0, 0] }),
      }).addTo(map);
      if (pick && !map.getBounds().contains([picked.lat, picked.lng])) map.setView([picked.lat, picked.lng], 16);
    }
    // A quiet week with no flyers: frame the recommended places and stays instead.
    if (!pick && initial && !list.length && placesRef.current.length) {
      map.fitBounds(L.latLngBounds(placesRef.current.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 16, animate: false });
    }
    const framing = !pick && (fit || initial) && list.length > 0;
    if (framing) {
      if (list.length > 1) map.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 16, animate: false });
      else map.setView([list[0].lat, list[0].lng], 16, { animate: false });
    }
    const box = drawCollage();
    if (framing && box) {
      // Then frame the cards themselves, not just the venue dots, zooming out a step if they don't fit.
      const size = map.getSize();
      const tooBig = box.x1 - box.x0 > size.x - 24 || box.y1 - box.y0 > size.y - insetBottom - 24;
      const centre = map.layerPointToLatLng(L.point((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2 + insetBottom / 2));
      map.setView(centre, tooBig && map.getZoom() > 14 ? map.getZoom() - 1 : map.getZoom(), { animate: false });
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, picked, places]);

  /** The blue "you are here" dot. */
  function drawHere() {
    const L = LRef.current;
    const map = mapRef.current;
    hereRef.current?.remove();
    hereRef.current = null;
    const h = hereProp.current;
    if (!L || !map || !h) return;
    hereRef.current = L.marker([h.lat, h.lng], {
      icon: L.divIcon({ className: "fc-marker", html: `<span class="fc-here" title="You are here"></span>`, iconSize: [0, 0] }),
      interactive: false,
      zIndexOffset: 1000,
    }).addTo(map);
  }

  useEffect(() => {
    drawHere();
  }, [here]);

  return <div ref={el} className={`z-0 h-full w-full ${className}`} role="region" aria-label="Map of flyers" />;
}
