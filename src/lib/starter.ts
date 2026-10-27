// The starter pack: real flyers photographed on Tapovan walls, straightened and checked by hand,
// shipped with the site so the board isn't empty on day one. Admin publishes the ones still upcoming.

import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { addDays, todayIST } from "./dates";
import { saveFlyer } from "./images";
import { buildOccurrences, createListing, ListingError, ListingInput } from "./listings";
import { resolveMapLink } from "./maplink";
import { adminPublish } from "./payments";
import { LISTING } from "./site";

const DIR = path.join(process.cwd(), "seed", "starter");
const DONE_KEY = "_STARTER_IMPORTED";

type StarterVenue = string | { slug: string; name: string; area: string; address?: string };
type StarterFlyer = {
  key: string;
  image: string;
  venue: StarterVenue;
  listing: Record<string, unknown> & { title: string; dates?: { date: string; start_time: string | null; end_time: string | null }[]; sessions?: { days: number[] }[] };
  note?: string;
};

export type StarterItem = { key: string; title: string; image: string; note: string | null; state: "ready" | "imported" | "past" | "no-dates" };

function readPack(): StarterFlyer[] {
  try {
    return (JSON.parse(fs.readFileSync(path.join(DIR, "flyers.json"), "utf8")) as { flyers: StarterFlyer[] }).flyers;
  } catch {
    return [];
  }
}

function imported(): Set<string> {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(DONE_KEY) as { value: string } | undefined;
  try {
    return new Set(JSON.parse(row?.value ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function upcoming(f: StarterFlyer, today: string) {
  const l = f.listing;
  return buildOccurrences(
    { dates: (l.dates ?? []).map((d) => ({ ...d })), sessions: (l.sessions ?? []) as never, until: null },
    today,
    addDays(today, LISTING.days - 1),
  ).length;
}

/** What's in the pack and whether each flyer can still go up. */
export function starterStatus(): StarterItem[] {
  const today = todayIST();
  const done = imported();
  return readPack().map((f) => ({
    key: f.key,
    title: f.listing.title,
    image: f.image,
    note: f.note ?? null,
    state: done.has(f.key) ? "imported" : !f.listing.dates?.length && !f.listing.sessions?.length ? "no-dates" : upcoming(f, today) ? "ready" : "past",
  }));
}

function ensureVenue(v: StarterVenue): string {
  if (typeof v === "string") return v;
  // Venues the flyer doesn't locate get no pin until the admin sets one.
  db()
    .prepare("INSERT OR IGNORE INTO venues (slug, name, area, address) VALUES (?, ?, ?, ?)")
    .run(v.slug, v.name, v.area, v.address ?? null);
  return v.slug;
}

/** The organiser's own Google Maps QR code beats our approximate pin. Best effort: needs the internet. */
async function pinVenueFromFlyer(venue: { slug: string } | object, links: { kind: string; url: string }[]) {
  const map = links.find((l) => l.kind === "map");
  if (!map || !("slug" in venue)) return;
  const v = db().prepare("SELECT id, coords_verified FROM venues WHERE slug = ?").get(venue.slug) as { id: number; coords_verified: number } | undefined;
  if (!v || v.coords_verified) return;
  const pin = await resolveMapLink(map.url).catch(() => null);
  if (pin) db().prepare("UPDATE venues SET lat = ?, lng = ?, coords_verified = 1 WHERE id = ?").run(pin.lat, pin.lng, v.id);
}

/** Publishes every starter flyer that's ready (free, as the admin). Safe to run twice. */
export async function importStarter(keys?: string[]) {
  const pack = readPack();
  const status = new Map(starterStatus().map((s) => [s.key, s.state]));
  const done = imported();
  const published: string[] = [];
  const failed: { title: string; reason: string }[] = [];
  for (const f of pack) {
    if (status.get(f.key) !== "ready" || (keys && !keys.includes(f.key))) continue;
    try {
      const up = await saveFlyer(fs.readFileSync(path.join(DIR, f.image)));
      const links = (f.listing.links as unknown[]) ?? [];
      db().prepare("UPDATE uploads SET qr_json = ? WHERE id = ?").run(JSON.stringify(links), up.id);
      const input = ListingInput.parse({ ...f.listing, uploadId: up.id, venue: { slug: ensureVenue(f.venue) }, organiser_email: null });
      const { id } = createListing(input);
      adminPublish(id, 0);
      await pinVenueFromFlyer(input.venue, input.links);
      done.add(f.key);
      published.push(f.listing.title);
    } catch (e) {
      failed.push({ title: f.listing.title, reason: e instanceof ListingError ? e.message : (e as Error).message });
    }
  }
  db()
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(DONE_KEY, JSON.stringify([...done]));
  return { published, failed };
}
