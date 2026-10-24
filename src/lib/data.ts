// Read-side queries. better-sqlite3 is synchronous, so each exported reader calls
// connection() first — otherwise Next.js would run the query at build time and bake
// the result into the static shell (see next/dist/docs connection.md).

import { connection } from "next/server";
import { db } from "./db";
import { nowTimeIST, todayIST, whenRange } from "./dates";
import { parseSchedule, type Schedule } from "./listings";
import type { FlyerLink } from "./links";
import { TIME_OPTIONS } from "./site";
import { priceShort } from "./util";

export type Venue = {
  id: number;
  slug: string;
  name: string;
  area: string;
  lat: number | null;
  lng: number | null;
  coords_verified: number;
  address: string | null;
  instagram: string | null;
  phone: string | null;
  description: string | null;
  is_demo: number;
};

export type Artist = { id: number; slug: string; name: string; instagram: string | null; is_demo: number };

export type Occurrence = { date: string; start_time: string | null; end_time: string | null; label?: string | null };

export type EventCard = {
  id: number;
  slug: string;
  title: string;
  category: string;
  kind: "event" | "classes";
  /** Weekdays with sessions (classes only), for "Daily" / "Mon–Sat" labels. */
  days: number[];
  flyer: string | null;
  flyer_w: number | null;
  flyer_h: number | null;
  price_type: string;
  price_min: number | null;
  price_max: number | null;
  price_note: string | null;
  featured: number;
  is_demo: number;
  venue: { slug: string; name: string; area: string; lat: number | null; lng: number | null };
  artists: { slug: string; name: string }[];
  next: Occurrence;
  dates_in_range: number;
};

export type AgendaItem = EventCard & { occ: Occurrence };

export type MapPin = {
  slug: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  events: {
    slug: string;
    title: string;
    category: string;
    kind: "event" | "classes";
    days: number[];
    flyer: string | null;
    flyer_w: number | null;
    flyer_h: number | null;
    price: string;
    date: string;
    start_time: string | null;
    label: string | null;
  }[];
};

export type Filters = {
  when?: string;
  cat?: string[];
  area?: string;
  price?: string;
  time?: string;
  q?: string;
  venue?: string;
  artist?: string;
};

const LIVE = `e.status = 'live' AND e.live_until >= @today`;

/** Today's occurrence has finished: past its end time, or 3h after start when no end is given. */
export function isOver(occ: Occurrence, today: string, now: string) {
  if (occ.date !== today || !occ.start_time) return false;
  let end = occ.end_time && occ.end_time > occ.start_time ? occ.end_time : null;
  if (!end) {
    const [h, m] = occ.start_time.split(":").map(Number);
    end = h + 3 > 23 ? "23:59" : `${String(h + 3).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return end < now;
}

type Row = Record<string, unknown>;

function artistsFor(eventIds: number[]) {
  const map = new Map<number, { slug: string; name: string }[]>();
  if (eventIds.length === 0) return map;
  const rows = db()
    .prepare(
      `SELECT ea.event_id, a.slug, a.name FROM event_artists ea JOIN artists a ON a.id = ea.artist_id
       WHERE ea.event_id IN (${eventIds.map(() => "?").join(",")}) ORDER BY a.name`,
    )
    .all(...eventIds) as { event_id: number; slug: string; name: string }[];
  for (const r of rows) {
    const list = map.get(r.event_id) ?? [];
    list.push({ slug: r.slug, name: r.name });
    map.set(r.event_id, list);
  }
  return map;
}

export type PinEvent = MapPin["events"][number];

/** A flyer as the map shows it, at its next session. */
export function pinEvent(e: Omit<EventCard, "venue" | "artists" | "next" | "dates_in_range" | "id" | "featured" | "is_demo">, at: Occurrence): PinEvent {
  return {
    slug: e.slug,
    title: e.title,
    category: e.category,
    kind: e.kind,
    days: e.days,
    flyer: e.flyer,
    flyer_w: e.flyer_w,
    flyer_h: e.flyer_h,
    price: priceShort(e),
    date: at.date,
    start_time: at.start_time,
    label: at.label ?? null,
  };
}

/** Weekdays a listing's sessions fall on. */
export function scheduleDays(schedule: Schedule | null): number[] {
  return [...new Set((schedule?.sessions ?? []).flatMap((x) => x.days))].sort();
}

function toCard(r: Row, artists: Map<number, { slug: string; name: string }[]>, days: Map<number, number[]>): AgendaItem {
  const occ = {
    date: r.date as string,
    start_time: r.start_time as string | null,
    end_time: r.end_time as string | null,
    label: (r.label as string | null) ?? null,
  };
  const id = r.id as number;
  if (!days.has(id)) days.set(id, scheduleDays(parseSchedule(r.schedule as string | null)));
  return {
    id,
    slug: r.slug as string,
    title: r.title as string,
    category: r.category as string,
    kind: r.kind === "classes" ? "classes" : "event",
    days: days.get(id)!,
    flyer: r.flyer as string | null,
    flyer_w: r.flyer_w as number | null,
    flyer_h: r.flyer_h as number | null,
    price_type: r.price_type as string,
    price_min: r.price_min as number | null,
    price_max: r.price_max as number | null,
    price_note: r.price_note as string | null,
    featured: r.featured as number,
    is_demo: r.is_demo as number,
    venue: {
      slug: r.v_slug as string,
      name: r.v_name as string,
      area: r.v_area as string,
      lat: r.v_lat as number | null,
      lng: r.v_lng as number | null,
    },
    artists: artists.get(r.id as number) ?? [],
    next: occ,
    occ,
    dates_in_range: 1,
  };
}

/** Everything the browse page needs: agenda (one row per date), wall (one card per flyer), map pins. */
export async function getWhatsOn(f: Filters) {
  await connection();
  return queryWhatsOn(f, todayIST(), nowTimeIST());
}

/** The query behind getWhatsOn, with "today" and "now" passed in so it can be tested. */
export function queryWhatsOn(f: Filters, today: string, now: string) {
  const { from, to } = whenRange(f.when, today);
  const where = [LIVE, "d.date BETWEEN @from AND @to"];
  const params: Record<string, unknown> = { today, from, to };

  const cats = (f.cat ?? []).filter(Boolean);
  if (cats.length) {
    where.push(`e.category IN (${cats.map((_, i) => `@cat${i}`).join(",")})`);
    cats.forEach((c, i) => (params[`cat${i}`] = c));
  }
  if (f.area) {
    where.push("v.area = @area");
    params.area = f.area;
  }
  if (f.venue) {
    where.push("v.slug = @venue");
    params.venue = f.venue;
  }
  if (f.artist) {
    where.push(
      "EXISTS (SELECT 1 FROM event_artists ea JOIN artists a ON a.id = ea.artist_id WHERE ea.event_id = e.id AND a.slug = @artist)",
    );
    params.artist = f.artist;
  }
  if (f.price === "free") where.push("e.price_type IN ('free','donation')");
  if (f.price === "u500" || f.price === "u1000") {
    where.push("(e.price_type IN ('free','donation') OR (e.price_type = 'paid' AND e.price_min <= @pmax))");
    params.pmax = f.price === "u500" ? 500 : 1000;
  }
  const time = TIME_OPTIONS.find((t) => t.key === f.time);
  if (time) {
    where.push("d.start_time BETWEEN @tfrom AND @tto");
    params.tfrom = time.from;
    params.tto = time.to;
  }
  if (f.q && f.q.trim()) {
    where.push(`(e.title LIKE @q OR e.description LIKE @q OR v.name LIKE @q OR d.label LIKE @q OR EXISTS (
      SELECT 1 FROM event_artists ea JOIN artists a ON a.id = ea.artist_id WHERE ea.event_id = e.id AND a.name LIKE @q))`);
    params.q = `%${f.q.trim()}%`;
  }
  const rows = (db()
    .prepare(
      `SELECT e.*, d.date, d.start_time, d.end_time, d.label,
              v.slug AS v_slug, v.name AS v_name, v.area AS v_area, v.lat AS v_lat, v.lng AS v_lng
       FROM event_dates d
       JOIN events e ON e.id = d.event_id
       JOIN venues v ON v.id = e.venue_id
       WHERE ${where.join(" AND ")}
       ORDER BY d.date, COALESCE(d.start_time, '99:99'), e.featured DESC, e.id
       LIMIT 3000`,
    )
    .all(params) as Row[]).filter((r) => !isOver(r as unknown as Occurrence, today, now));

  const artists = artistsFor([...new Set(rows.map((r) => r.id as number))]);
  const days = new Map<number, number[]>();
  const agenda = rows.map((r) => toCard(r, artists, days));

  const byEvent = new Map<number, AgendaItem>();
  for (const item of agenda) {
    const existing = byEvent.get(item.id);
    if (existing) existing.dates_in_range++;
    else byEvent.set(item.id, { ...item });
  }
  // One-off events first: they're what people miss. Regular classes follow.
  const wall = [...byEvent.values()].sort(
    (a, b) =>
      b.featured - a.featured ||
      Number(a.kind === "classes") - Number(b.kind === "classes") ||
      a.next.date.localeCompare(b.next.date) ||
      (a.next.start_time ?? "99").localeCompare(b.next.start_time ?? "99"),
  );

  const pins = new Map<string, MapPin>();
  for (const item of agenda) {
    if (item.venue.lat == null || item.venue.lng == null) continue;
    const pin = pins.get(item.venue.slug) ?? {
      slug: item.venue.slug,
      name: item.venue.name,
      area: item.venue.area,
      lat: item.venue.lat,
      lng: item.venue.lng,
      events: [],
    };
    if (!pin.events.some((e) => e.slug === item.slug)) pin.events.push(pinEvent(item, item.occ));
    pins.set(item.venue.slug, pin);
  }

  return { today, from, to, agenda, wall, pins: [...pins.values()] };
}

export type EventDetail = {
  event: Row & {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    category: string;
    kind: string;
    schedule: string | null;
    links: string | null;
    flyer: string | null;
    flyer_w: number | null;
    flyer_h: number | null;
    price_type: string;
    price_min: number | null;
    price_max: number | null;
    price_note: string | null;
    contact_phone: string | null;
    contact_instagram: string | null;
    booking_url: string | null;
    organiser_name: string | null;
    organiser_email: string | null;
    manage_token: string;
    published_at: string | null;
    featured: number;
    venue_id: number;
    status: string;
    live_until: string | null;
    is_demo: number;
    views: number;
  };
  venue: Venue;
  dates: Occurrence[];
  artists: Artist[];
  schedule: Schedule | null;
  links: FlyerLink[];
  isLive: boolean;
};

export function parseLinks(json: string | null | undefined): FlyerLink[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as FlyerLink[];
  } catch {
    return [];
  }
}

function loadDetail(where: string, value: string | number): EventDetail | null {
  const event = db().prepare(`SELECT * FROM events WHERE ${where} = ?`).get(value) as EventDetail["event"] | undefined;
  if (!event) return null;
  const today = todayIST();
  const venue = db().prepare("SELECT * FROM venues WHERE id = ?").get(event.venue_id) as Venue;
  const dates = db()
    .prepare("SELECT date, start_time, end_time, label FROM event_dates WHERE event_id = ? ORDER BY date, start_time")
    .all(event.id) as Occurrence[];
  const artists = db()
    .prepare("SELECT a.* FROM event_artists ea JOIN artists a ON a.id = ea.artist_id WHERE ea.event_id = ? ORDER BY a.name")
    .all(event.id) as Artist[];
  const isLive = event.status === "live" && !!event.live_until && event.live_until >= today;
  return { event, venue, dates, artists, schedule: parseSchedule(event.schedule), links: parseLinks(event.links), isLive };
}

export async function getEventBySlug(slug: string) {
  await connection();
  return loadDetail("slug", slug);
}

export async function getEventByToken(token: string) {
  await connection();
  return loadDetail("manage_token", token);
}

export function getEventById(id: number) {
  return loadDetail("id", id);
}

export async function getVenue(slug: string) {
  await connection();
  return (db().prepare("SELECT * FROM venues WHERE slug = ?").get(slug) as Venue | undefined) ?? null;
}

export async function getArtist(slug: string) {
  await connection();
  return (db().prepare("SELECT * FROM artists WHERE slug = ?").get(slug) as Artist | undefined) ?? null;
}

export async function listVenues() {
  await connection();
  return db().prepare("SELECT * FROM venues ORDER BY name").all() as Venue[];
}

export async function listArtists() {
  await connection();
  return db()
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM event_artists ea JOIN events e ON e.id = ea.event_id
                    WHERE ea.artist_id = a.id AND e.status = 'live' AND e.live_until >= ?) AS live_count
       FROM artists a ORDER BY live_count DESC, a.name`,
    )
    .all(todayIST()) as (Artist & { live_count: number })[];
}

export async function countLive() {
  await connection();
  const r = db()
    .prepare(
      `SELECT COUNT(DISTINCT e.id) AS n FROM events e JOIN event_dates d ON d.event_id = e.id
       WHERE e.status = 'live' AND e.live_until >= @today AND d.date >= @today`,
    )
    .get({ today: todayIST() }) as { n: number };
  return r.n;
}

/** Venues with how many live flyers they have coming up, for the directory page. */
export async function listVenuesWithCounts() {
  await connection();
  return db()
    .prepare(
      `SELECT v.*, COUNT(DISTINCT e.id) AS upcoming, MIN(d.date) AS next_date
       FROM venues v
       LEFT JOIN events e ON e.venue_id = v.id AND e.status = 'live' AND e.live_until >= @today
       LEFT JOIN event_dates d ON d.event_id = e.id AND d.date >= @today
       GROUP BY v.id ORDER BY upcoming DESC, v.name`,
    )
    .all({ today: todayIST() }) as (Venue & { upcoming: number; next_date: string | null })[];
}
