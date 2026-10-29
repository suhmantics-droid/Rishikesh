"use client";

import { useSyncExternalStore } from "react";
import { nowTimeIST, todayIST } from "@/lib/dates";
import { ASSUMED_MINUTES } from "@/lib/now";

// Client-only "now" and "where am I", shared by every card on the page. Both render nothing on the
// server, so cached pages never show a stale "on now" or someone else's walking time.

// ---- now (IST), ticking every 30s ----
let nowSnap: { date: string; time: string } | null = null;
const nowSubs = new Set<() => void>();
function readNow() {
  const date = todayIST();
  const time = nowTimeIST();
  if (!nowSnap || nowSnap.date !== date || nowSnap.time !== time) nowSnap = { date, time };
  return nowSnap;
}
let ticker: ReturnType<typeof setInterval> | null = null;
function subscribeNow(cb: () => void) {
  nowSubs.add(cb);
  ticker ??= setInterval(() => nowSubs.forEach((f) => f()), 30_000);
  return () => {
    nowSubs.delete(cb);
    if (!nowSubs.size && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}
export function useNow() {
  return useSyncExternalStore(subscribeNow, readNow, () => null);
}

const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** "On now" while it's happening; "in 25 min" in the 90 minutes before. */
export function liveState(date: string, start: string | null, end: string | null, now: { date: string; time: string }) {
  if (date !== now.date || !start) return null;
  const n = mins(now.time);
  const s = mins(start);
  const e = end && end > start ? mins(end) : s + ASSUMED_MINUTES;
  if (n >= s && n < e) return { on: true, label: "On now" };
  if (s > n && s - n <= 90) return { on: false, label: s - n < 60 ? `in ${s - n} min` : `in ${Math.floor((s - n) / 60)}h ${(s - n) % 60}m` };
  return null;
}

export function LiveBadge({ date, start, end, className = "" }: { date: string; start: string | null; end: string | null; className?: string }) {
  const now = useNow();
  const st = now ? liveState(date, start, end, now) : null;
  if (!st) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[13px] font-extrabold tracking-wide uppercase ${
        st.on ? "bg-now text-on-now" : "bg-ink text-wall"
      } ${className}`}
    >
      {st.label}
    </span>
  );
}

// ---- where am I ----
type Here = { lat: number; lng: number };
const KEY = "pinned:here";
let hereSnap: Here | null | undefined;
const hereSubs = new Set<() => void>();
function readHere(): Here | null {
  if (hereSnap === undefined) {
    try {
      const raw = sessionStorage.getItem(KEY);
      hereSnap = raw ? (JSON.parse(raw) as Here) : null;
    } catch {
      hereSnap = null;
    }
  }
  return hereSnap;
}
function setHere(h: Here | null) {
  hereSnap = h;
  try {
    if (h) sessionStorage.setItem(KEY, JSON.stringify(h));
    else sessionStorage.removeItem(KEY);
  } catch {}
  hereSubs.forEach((f) => f());
}
export function useHere() {
  return useSyncExternalStore(
    (cb) => {
      hereSubs.add(cb);
      return () => hereSubs.delete(cb);
    },
    readHere,
    () => null,
  );
}

/** Asks the phone for its location (only when tapped). Resolves to an error message, or null. */
export function locateMe(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve("Your browser can't share its location.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setHere({ lat: p.coords.latitude, lng: p.coords.longitude });
        resolve(null);
      },
      (e) => resolve(e.code === e.PERMISSION_DENIED ? "Location is blocked for this site. Allow it in your browser settings." : "Couldn't find you. Try again outside."),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
export const forgetHere = () => setHere(null);

/** Straight-line metres between two points. */
export function metres(a: Here, b: Here) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tapovan's lanes wind up and down the hill: allow 1.4× the straight line at 70 m a minute. */
export function walkLabel(m: number) {
  const minutes = Math.max(1, Math.round((m * 1.4) / 70));
  return minutes <= 45 ? `${minutes} min walk` : `${(m / 1000).toFixed(1)} km`;
}

export function WalkTime({ lat, lng, className = "" }: { lat: number | null; lng: number | null; className?: string }) {
  const here = useHere();
  if (!here || lat == null || lng == null) return null;
  return <span className={className}>{walkLabel(metres(here, { lat, lng }))}</span>;
}
