"use client";

import { type MutableRefObject, useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { MapPin, Place } from "@/lib/data";
import { layoutCollage } from "@/lib/collage";
import { daysLabel, formatDay, formatTime, WEEKDAY_SHORT, weekday } from "@/lib/dates";
import { category, SITE } from "@/lib/site";
import { escapeHtml, flyerUrl } from "@/lib/util";
import { iconSvg } from "./Icon";

const TILES = process.env.NEXT_PUBLIC_MAP_TILES || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

type Item = MapPin["events"][number];

/** Controls a page can call on the map (zoom buttons, "show me this place"). */
export type MapApi = { zoomIn: () => void; zoomOut: () => void; focus: (slug: string) => void; zoomTo: (zoom: number) => void };

/** The first session at a venue as a short label: "4:00pm", "Sat 7:00pm", "+1" when there are more. */
function pinLabel(items: Item[], today: string) {
  const first = items[0];
  if (!first) return "";
  const t = formatTime(first.start_time) || "time n/a";
  const day = first.date === today ? "" : formatDay(first.date, today) === "Tomorrow" ? "Tomorrow " : `${WEEKDAY_SHORT[weekday(first.date)]} `;
  return `${day}${t}${items.length > 1 ? ` +${items.length - 1}` : ""}`;
}

type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w + 4 && b.x < a.x + a.w + 4 && a.y < b.y + b.h + 4 && b.y < a.y + a.h + 4;

/** Sessions at one venue, most time-sensitive first. */
function sortItems(events: Item[]) {
  return [...events].sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "99").localeCompare(b.start_time ?? "99") || Number(a.kind === "classes") - Number(b.kind === "classes"));
}

/** Zoom at which the cafes and studios in the guide appear (street level). */
const GUIDE_ZOOM = 17;

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

function cardHtml(e: Item, i: number, w: number, h: number, dx: number, dy: number, today: string, extra: number, slip: string, sel: boolean) {
  const src = flyerUrl(e.flyer, "sm");
  const body = src
    ? `<img src="${src}" alt="" loading="lazy" draggable="false">`
    : `<span class="fc-text" style="border-top:4px solid ${category(e.category).color}">${escapeHtml(e.title)}</span>`;
  return `<div class="fc-card${sel ? " is-sel" : ""}" role="button" tabindex="0" data-i="${i}" aria-label="${escapeHtml(e.title)}, ${escapeHtml(when(e, today))}"
      style="left:${dx - w / 2}px;top:${dy - h / 2}px;width:${w}px;height:${h}px;transform:rotate(${tilt(e.slug)}deg)">
      ${body}${slip ? `<span class="fc-slip">${escapeHtml(slip)}</span>` : ""}${extra ? `<span class="fc-more">+${extra}</span>` : ""}</div>`;
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
        <u>See the flyer</u>
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
  const what = [p.recommended ? "Recommended" : p.stay ? "Place to stay" : null, p.kind].filter(Boolean).join(" · ");
  const rating = p.google_rating ? `Google ${p.google_rating.toFixed(1)} of 5${p.google_reviews ? ` · ${p.google_reviews.toLocaleString("en-IN")} reviews` : ""}` : "";
  return `<a href="/v/${p.slug}" class="fc-pop">
      <span class="fc-pop-body">
        <span class="fc-pop-cat">${escapeHtml(what)}</span>
        <b>${escapeHtml(p.name)}</b>
        ${rating ? `<span>${escapeHtml(rating)}</span>` : ""}
        <u>See the place</u>
      </span></a>`;
}

/**
 * The map. Zoomed out, each place with something on is a dot with its first time on a paper label.
 * Zoomed in, the flyers themselves are pinned near their venue, spread out so none hide each other,
 * with a thread back to the spot. Approximate spots get a dashed ring and say so.
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
  insetTop = 0,
  here = null,
  places = [],
  dots = false,
  faded = [],
  labelsBelow = 0,
  onSelect,
  selected = null,
  apiRef,
  onZoom,
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
  /** Height of a panel covering the bottom (or top) of the map, kept clear when framing. */
  insetBottom?: number;
  insetTop?: number;
  /** The visitor's location, shown as a dot. */
  here?: { lat: number; lng: number } | null;
  /** Calm mode: a dot per venue (with a count) instead of the flyer collage; tap a dot for what's on. */
  dots?: boolean;
  /** Places with flyers outside the chosen time: hollow dots, so the map isn't misleadingly empty. */
  faded?: MapPin[];
  /** Below this zoom, show time labels instead of flyers (0: always flyers). */
  labelsBelow?: number;
  /** Tapping a place selects it (the page shows it in a sheet) instead of opening a popup. */
  onSelect?: (slug: string) => void;
  selected?: string | null;
  apiRef?: MutableRefObject<MapApi | null>;
  onZoom?: (zoom: number, labels: boolean) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pickRef = useRef<import("leaflet").Marker | null>(null);
  const hereRef = useRef<import("leaflet").Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const fadedRef = useRef(faded);
  fadedRef.current = faded;
  const placesRef = useRef(places);
  placesRef.current = places;
  const dotsRef = useRef(dots);
  dotsRef.current = dots;
  const selRef = useRef(selected);
  selRef.current = selected;
  const hereProp = useRef(here);
  hereProp.current = here;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, { zoomControl: !apiRef, scrollWheelZoom: !!pick || !!apiRef }).setView(SITE.mapCenter, SITE.mapZoom);
      L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      map.on("click", (ev: import("leaflet").LeafletMouseEvent) => onPickRef.current?.(ev.latlng.lat, ev.latlng.lng));
      map.on("zoomend", () => {
        drawCollage();
        reportZoom();
      });
      if (apiRef) {
        apiRef.current = {
          zoomIn: () => map.zoomIn(),
          zoomOut: () => map.zoomOut(),
          zoomTo: (z) => map.setZoom(z),
          focus: (slug) => {
            const p = [...pinsRef.current, ...fadedRef.current].find((x) => x.slug === slug);
            if (!p) return;
            const z = Math.max(map.getZoom(), labelsBelow || 16);
            // Keep the place clear of the sheet over the bottom of the map.
            const pt = map.project([p.lat, p.lng], z).add([0, insetBottom / 2 - insetTop / 2]);
            map.setView(map.unproject(pt, z), z);
          },
        };
      }
      // Keyboard: Enter on a focused flyer card or label opens it.
      el.current.addEventListener("keydown", (ev) => {
        const card = (ev.target as HTMLElement).closest?.(".fc-card, .fc-lab") as HTMLElement | null;
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
          reportZoom();
        }, 60),
      );
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      if (apiRef) apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function labelsNow() {
    const map = mapRef.current;
    return !!map && !!labelsBelow && map.getZoom() < labelsBelow;
  }
  function reportZoom() {
    const map = mapRef.current;
    if (map) onZoomRef.current?.(map.getZoom(), labelsNow());
  }

  /** The dot for a venue: dashed ring when the spot is approximate. */
  function dotHtml(p: MapPin, hollow = false) {
    const ring = p.coords_verified ? "" : `<span class="fc-ring" title="Approximate spot"></span>`;
    return `${ring}<span class="fc-dot${hollow ? " fc-dot-hollow" : ""}"></span>`;
  }

  function select(slug: string, open: () => void) {
    if (onSelectRef.current) onSelectRef.current(slug);
    else open();
  }

  /** Places a label or card for every venue at the current zoom. Returns the collage's pixel extent. */
  function drawCollage() {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return null;
    layer.clearLayers();
    const zoom = map.getZoom();
    const sel = selRef.current;
    const list = pinsRef.current;
    const venues = list.map((p) => {
      const pt = map.latLngToLayerPoint([p.lat, p.lng]);
      const items = sortItems(p.events);
      return { pin: p, items, key: p.slug, x: pt.x, y: pt.y, cards: items.map((e) => cardSize(e, zoom)) };
    });

    // Places with flyers at other times: hollow dots, with a quiet label when zoomed out.
    for (const p of fadedRef.current) {
      if (list.some((x) => x.slug === p.slug)) continue;
      const items = sortItems(p.events);
      const first = items[0];
      const note = labelsNow() && first && !list.length ? `<span class="fc-lab fc-lab-faded" role="button" tabindex="0">${escapeHtml(pinLabel(items, today))}<small>${escapeHtml(p.name)} · ${escapeHtml(category(first.category).short.toLowerCase())}</small></span>` : "";
      const marker = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "fc-marker", html: dotHtml(p, true) + note, iconSize: [0, 0] }), keyboard: false, zIndexOffset: -200 }).addTo(layer);
      marker.on("click", () =>
        select(p.slug, () =>
          L.popup({ offset: L.point(0, -8), maxWidth: 280, minWidth: 220, className: "fc-popup" }).setLatLng([p.lat, p.lng]).setContent(listPopupHtml(items, p, today)).openOn(map),
        ),
      );
    }

    if (dotsRef.current || labelsNow()) {
      // Labels go right of the dot, else left, above or below; one that fits nowhere is left off
      // (the dot stays, and tapping it still opens the place).
      const taken: Rect[] = venues.map((v) => ({ x: v.x - 9, y: v.y - 9, w: 18, h: 18 }));
      const origin = map.containerPointToLayerPoint([0, 0]);
      const view = { x: origin.x, y: origin.y, w: map.getSize().x, h: map.getSize().y };
      const inView = (r: Rect) => r.x >= view.x + 4 && r.y >= view.y + 4 && r.x + r.w <= view.x + view.w - 64 && r.y + r.h <= view.y + view.h - 4;
      const order = [...venues].sort((a, b) => Number(b.key === sel) - Number(a.key === sel) || (a.items[0]?.start_time ?? "99").localeCompare(b.items[0]?.start_time ?? "99"));
      const spots = new Map<string, { x: number; y: number } | null>();
      for (const v of order) {
        if (dotsRef.current) break;
        const name = `${v.pin.name}${v.pin.coords_verified ? "" : " · approx."}`;
        const w = Math.round(Math.max(pinLabel(v.items, today).length * 7.4, Math.min(name.length, 30) * 6.9) + 18);
        const h = 40;
        const options = [
          { x: 12, y: -14 },
          { x: -12 - w, y: -14 },
          { x: -w / 2, y: -h - 12 },
          { x: -w / 2, y: 12 },
        ];
        const own = { x: v.x - 9, y: v.y - 9, w: 18, h: 18 };
        const free = (o: { x: number; y: number }) => {
          const r = { x: v.x + o.x, y: v.y + o.y, w, h };
          return !taken.some((t) => t !== taken.find((q) => q.x === own.x && q.y === own.y) && overlaps(t, r));
        };
        const fit = options.find((o) => free(o) && inView({ x: v.x + o.x, y: v.y + o.y, w, h })) ?? options.find(free);
        spots.set(v.key, fit ?? null);
        if (fit) taken.push({ x: v.x + fit.x, y: v.y + fit.y, w, h });
      }
      for (const v of venues) {
        const n = v.items.length;
        const approx = v.pin.coords_verified ? "" : " · approx.";
        const spot = spots.get(v.key);
        const label = spot
          ? `<span class="fc-lab${sel === v.key ? " is-sel" : ""}" style="left:${spot.x}px;top:${spot.y}px;max-width:230px" role="button" tabindex="0" aria-label="${escapeHtml(v.pin.name)}: ${escapeHtml(pinLabel(v.items, today))}">${escapeHtml(pinLabel(v.items, today))}<small>${escapeHtml(v.pin.name)}${approx}</small></span>`
          : "";
        const html = dotsRef.current ? `${dotHtml(v.pin)}${n > 1 ? `<span class="fc-count">${n}</span>` : ""}` : `${dotHtml(v.pin)}${label}`;
        const marker = L.marker([v.pin.lat, v.pin.lng], { icon: L.divIcon({ className: "fc-marker", html, iconSize: [0, 0] }), keyboard: false, riseOnHover: true, zIndexOffset: sel === v.key ? 1000 : 0 }).addTo(layer);
        marker.on("click", () =>
          select(v.key, () =>
            L.popup({ offset: L.point(0, -8), maxWidth: 280, minWidth: 220, className: "fc-popup" })
              .setLatLng([v.pin.lat, v.pin.lng])
              .setContent(n === 1 ? popupHtml(v.items[0], v.pin, today) : listPopupHtml(v.items, v.pin, today))
              .openOn(map),
          ),
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
      box.y1 = Math.max(box.y1, v.y + pl.dy + h / 2 + 14);
    }
    for (const v of venues) {
      const mine = placed.filter((pl) => pl.venue === v.key);
      const extra = hidden[v.key] ?? 0;
      let html = "";
      for (const pl of mine) html += leaderHtml(pl.dx, pl.dy, v.cards[pl.card].h);
      html += dotHtml(v.pin);
      for (const [n, pl] of mine.entries()) {
        const { w, h } = v.cards[pl.card];
        const e = v.items[pl.card];
        const slip = w >= 58 ? `${formatTime(e.start_time) || formatDay(e.date, today)}${n === 0 && !v.pin.coords_verified ? " · approx." : ""}` : "";
        html += cardHtml(e, pl.card, w, h, pl.dx, pl.dy, today, n === 0 ? extra : 0, slip, sel === v.key);
      }
      if (!mine.length && extra) html += `<span class="fc-more fc-more-dot">+${extra}</span>`;
      const marker = L.marker([v.pin.lat, v.pin.lng], {
        icon: L.divIcon({ className: "fc-marker", html, iconSize: [0, 0] }),
        keyboard: false,
        riseOnHover: true,
        zIndexOffset: sel === v.key ? 1000 : 0,
      }).addTo(layer);
      marker.on("click", (ev: import("leaflet").LeafletMouseEvent) => {
        const card = (ev.originalEvent.target as HTMLElement).closest?.(".fc-card") as HTMLElement | null;
        const index = card ? Number(card.dataset.i) : 0;
        const pl = mine.find((m) => m.card === index) ?? mine[0];
        const item = v.items[index] ?? v.items[0];
        if (!item) return;
        const h = pl ? v.cards[pl.card].h : 0;
        select(v.key, () =>
          L.popup({ offset: L.point(pl?.dx ?? 0, (pl?.dy ?? 0) - h / 2 + 4), maxWidth: 280, minWidth: 220, className: "fc-popup" })
            .setLatLng([v.pin.lat, v.pin.lng])
            .setContent(popupHtml(item, v.pin, today))
            .openOn(map),
        );
      });
    }
    drawPlaces(venues.map((v) => v.key));
    return venues.length ? box : null;
  }

  /**
   * Places (recommended, stays), unless a flyer there already marks the spot. Guide places (cafes,
   * studios) are many and small: they only appear once the map is zoomed in to street level.
   */
  function drawPlaces(taken: string[]) {
    const L = LRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;
    const close = map.getZoom() >= GUIDE_ZOOM;
    const busy = [...taken, ...fadedRef.current.map((f) => f.slug)];
    for (const p of placesRef.current) {
      if (busy.includes(p.slug)) continue;
      const featured = p.recommended || p.stay;
      if (!featured && !close) continue;
      const [cls, mark] = p.recommended
        ? ["fc-place-rec", iconSvg("recommended", 14)]
        : p.stay
          ? ["fc-place-stay", iconSvg("stay", 14)]
          : ["fc-place-guide", iconSvg(p.guide === "eat" ? "cup" : "lotus", 12)];
      const marker = L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: "fc-marker",
          html: `<span class="fc-place ${cls}" title="${escapeHtml(p.name)}">${mark}</span>`,
          iconSize: [0, 0],
        }),
        zIndexOffset: featured ? -100 : -500,
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
    const pad = { paddingTopLeft: [50, 50 + insetTop] as [number, number], paddingBottomRight: [50, 50 + insetBottom] as [number, number], animate: false };
    // Nothing on in this window: frame the places with flyers at other times, or the recommended places.
    const fallback = fadedRef.current.length ? fadedRef.current : placesRef.current;
    if (!pick && initial && !list.length && fallback.length) {
      map.fitBounds(L.latLngBounds(fallback.map((p) => [p.lat, p.lng])), { ...pad, maxZoom: 16 });
    }
    const framing = !pick && (fit || initial) && list.length > 0;
    const maxZoom = labelsBelow ? labelsBelow - 1 : 16;
    if (framing) {
      if (list.length > 1) map.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lng])), { ...pad, maxZoom });
      else map.setView([list[0].lat, list[0].lng], maxZoom, { animate: false });
    }
    const box = drawCollage();
    if (framing && box) {
      // Then frame the cards themselves, not just the venue dots, zooming out a step if they don't fit.
      const size = map.getSize();
      const tooBig = box.x1 - box.x0 > size.x - 24 || box.y1 - box.y0 > size.y - insetBottom - insetTop - 24;
      const centre = map.layerPointToLatLng(L.point((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2 + insetBottom / 2 - insetTop / 2));
      map.setView(centre, tooBig && map.getZoom() > 14 ? map.getZoom() - 1 : map.getZoom(), { animate: false });
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    frame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, picked, places, faded]);

  useEffect(() => {
    if (mapRef.current) drawCollage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  /** The "you are here" dot. */
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
