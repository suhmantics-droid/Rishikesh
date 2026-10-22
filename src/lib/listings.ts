// Write-side: creating, editing, publishing and renewing flyer listings.

import { z } from "zod";
import { db } from "./db";
import { addDays, expandWeekly, isValidDate, isValidTime, todayIST } from "./dates";
import { AREAS, CATEGORY_KEYS, LISTING } from "./site";
import { instagramHandle, safeUrl, shortId, slugify, token } from "./util";

const time = z
  .string()
  .nullish()
  .transform((t) => (t && isValidTime(t) ? t : null));

export const ListingInput = z.object({
  uploadId: z.string().regex(/^[a-z0-9]{14}$/),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(1200).nullish(),
  category: z.enum(CATEGORY_KEYS),
  dates: z
    .array(z.object({ date: z.string().refine(isValidDate), start_time: time, end_time: time }))
    .max(60)
    .default([]),
  weekly: z
    .object({
      days: z.array(z.number().int().min(0).max(6)).min(1),
      start_time: time,
      end_time: time,
      until: z.string().refine(isValidDate),
    })
    .nullish(),
  venue: z.union([
    z.object({ slug: z.string().min(1) }),
    z.object({
      name: z.string().trim().min(2).max(80),
      area: z.enum(AREAS.map((a) => a.key) as [string, ...string[]]),
      lat: z.number().min(29.9).max(30.4),
      lng: z.number().min(78.1).max(78.6),
      address: z.string().trim().max(160).nullish(),
    }),
  ]),
  price_type: z.enum(["free", "donation", "paid", "unknown"]),
  price_min: z.number().int().min(0).max(1000000).nullish(),
  price_max: z.number().int().min(0).max(1000000).nullish(),
  price_note: z.string().trim().max(80).nullish(),
  artists: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  contact_phone: z.string().trim().max(24).nullish(),
  contact_instagram: z.string().trim().max(60).nullish(),
  booking_url: z.string().trim().max(300).nullish(),
  organiser_name: z.string().trim().max(80).nullish(),
  organiser_email: z.string().trim().email().max(120).nullish(),
  ai_extracted: z.boolean().optional(),
});
export type ListingInputT = z.infer<typeof ListingInput>;

function occurrences(input: ListingInputT) {
  const today = todayIST();
  const all = [...input.dates];
  if (input.weekly) {
    const until = input.weekly.until < addDays(today, 180) ? input.weekly.until : addDays(today, 180);
    for (const date of expandWeekly(today, until, input.weekly.days)) {
      all.push({ date, start_time: input.weekly.start_time, end_time: input.weekly.end_time });
    }
  }
  const seen = new Set<string>();
  return all
    .filter((d) => d.date >= today)
    .filter((d) => {
      const k = `${d.date} ${d.start_time}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => (a.date + (a.start_time ?? "")).localeCompare(b.date + (b.start_time ?? "")))
    .slice(0, 60);
}

function resolveVenue(v: ListingInputT["venue"]): number {
  const d = db();
  if ("slug" in v) {
    const row = d.prepare("SELECT id FROM venues WHERE slug = ?").get(v.slug) as { id: number } | undefined;
    if (!row) throw new ListingError("Unknown venue");
    return row.id;
  }
  const existing = d.prepare("SELECT id FROM venues WHERE lower(name) = lower(?)").get(v.name) as { id: number } | undefined;
  if (existing) return existing.id;
  let slug = slugify(v.name, 40);
  if (d.prepare("SELECT 1 FROM venues WHERE slug = ?").get(slug)) slug = `${slug}-${shortId()}`;
  const r = d
    .prepare("INSERT INTO venues (slug, name, area, lat, lng, address) VALUES (?, ?, ?, ?, ?, ?)")
    .run(slug, v.name, v.area, v.lat, v.lng, v.address ?? null);
  return Number(r.lastInsertRowid);
}

function upsertArtist(name: string): number {
  const d = db();
  const clean = name.replace(/\s+/g, " ").trim();
  const existing = d.prepare("SELECT id FROM artists WHERE lower(name) = lower(?)").get(clean) as { id: number } | undefined;
  if (existing) return existing.id;
  let slug = slugify(clean, 40);
  if (d.prepare("SELECT 1 FROM artists WHERE slug = ?").get(slug)) slug = `${slug}-${shortId()}`;
  return Number(d.prepare("INSERT INTO artists (slug, name) VALUES (?, ?)").run(slug, clean).lastInsertRowid);
}

export class ListingError extends Error {}

function fields(input: ListingInputT) {
  const upload = db().prepare("SELECT w, h FROM uploads WHERE id = ?").get(input.uploadId) as { w: number; h: number } | undefined;
  if (!upload) throw new ListingError("Flyer upload not found — please upload it again.");
  const priceMin = input.price_type === "paid" || input.price_type === "donation" ? (input.price_min ?? null) : null;
  const priceMax = input.price_type === "paid" && input.price_max && priceMin && input.price_max > priceMin ? input.price_max : null;
  return {
    title: input.title,
    description: input.description || null,
    category: input.category,
    flyer: input.uploadId,
    flyer_w: upload.w,
    flyer_h: upload.h,
    venue_id: resolveVenue(input.venue),
    price_type: input.price_type,
    price_min: priceMin,
    price_max: priceMax,
    price_note: input.price_note || null,
    contact_phone: input.contact_phone || null,
    contact_instagram: instagramHandle(input.contact_instagram),
    booking_url: safeUrl(input.booking_url),
    organiser_name: input.organiser_name || null,
    organiser_email: input.organiser_email?.toLowerCase() || null,
  };
}

function writeDatesAndArtists(eventId: number, input: ListingInputT) {
  const d = db();
  const occ = occurrences(input);
  if (occ.length === 0) throw new ListingError("Add at least one upcoming date.");
  d.prepare("DELETE FROM event_dates WHERE event_id = ?").run(eventId);
  const ins = d.prepare("INSERT INTO event_dates (event_id, date, start_time, end_time) VALUES (?, ?, ?, ?)");
  for (const o of occ) ins.run(eventId, o.date, o.start_time, o.end_time);
  d.prepare("DELETE FROM event_artists WHERE event_id = ?").run(eventId);
  const link = d.prepare("INSERT OR IGNORE INTO event_artists (event_id, artist_id) VALUES (?, ?)");
  for (const name of input.artists) link.run(eventId, upsertArtist(name));
}

export function createListing(input: ListingInputT) {
  const d = db();
  return d.transaction(() => {
    const f = fields(input);
    const slug = `${slugify(input.title, 40)}-${shortId()}`;
    const manage = token();
    const r = d
      .prepare(
        `INSERT INTO events (slug, title, description, category, flyer, flyer_w, flyer_h, venue_id, price_type, price_min,
           price_max, price_note, contact_phone, contact_instagram, booking_url, organiser_name, organiser_email,
           manage_token, status, ai_extracted)
         VALUES (@slug, @title, @description, @category, @flyer, @flyer_w, @flyer_h, @venue_id, @price_type, @price_min,
           @price_max, @price_note, @contact_phone, @contact_instagram, @booking_url, @organiser_name, @organiser_email,
           @manage, 'pending_payment', @ai)`,
      )
      .run({ ...f, slug, manage, ai: input.ai_extracted ? 1 : 0 });
    const id = Number(r.lastInsertRowid);
    writeDatesAndArtists(id, input);
    return { id, slug, manageToken: manage };
  })();
}

export function updateListing(eventId: number, input: ListingInputT) {
  const d = db();
  d.transaction(() => {
    const f = fields(input);
    d.prepare(
      `UPDATE events SET title=@title, description=@description, category=@category, flyer=@flyer, flyer_w=@flyer_w,
         flyer_h=@flyer_h, venue_id=@venue_id, price_type=@price_type, price_min=@price_min, price_max=@price_max,
         price_note=@price_note, contact_phone=@contact_phone, contact_instagram=@contact_instagram,
         booking_url=@booking_url, organiser_name=@organiser_name, organiser_email=@organiser_email,
         updated_at=datetime('now') WHERE id=@id`,
    ).run({ ...f, id: eventId });
    writeDatesAndArtists(eventId, input);
  })();
}

/** Makes a listing live for LISTING.days, or extends it if it is already live. Returns the new end date. */
export function publishOrRenew(eventId: number): { liveUntil: string; firstPublish: boolean } {
  const d = db();
  const e = d.prepare("SELECT status, live_until, published_at FROM events WHERE id = ?").get(eventId) as
    | { status: string; live_until: string | null; published_at: string | null }
    | undefined;
  if (!e) throw new ListingError("Listing not found");
  const today = todayIST();
  const start = e.live_until && e.live_until >= today ? addDays(e.live_until, 1) : today;
  const liveUntil = addDays(start, LISTING.days - 1);
  d.prepare(
    `UPDATE events SET status='live', live_until=?, published_at=COALESCE(published_at, datetime('now')),
       updated_at=datetime('now') WHERE id=?`,
  ).run(liveUntil, eventId);
  return { liveUntil, firstPublish: !e.published_at };
}

export function setStatus(eventId: number, status: "live" | "hidden" | "rejected" | "pending_review") {
  db().prepare("UPDATE events SET status=?, updated_at=datetime('now') WHERE id=?").run(status, eventId);
}
