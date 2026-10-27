// Uploaded flyer photos before they become listings: reading them, spotting duplicates, and the
// admin's queue of photos from a batch upload (walk Tapovan, snap twenty flyers, post them later).

import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import { addDays, todayIST } from "./dates";
import { aiEnabled, extractFlyer, type FlyerFields } from "./extract";
import { hashDistance, readFlyer, SAME_FLYER } from "./images";
import type { FlyerLink } from "./links";
import { flyerUrl } from "./util";

type UploadRow = { id: string; w: number; h: number; extracted_json: string | null; qr_json: string | null; phash: string | null; parent: string | null; created_at: string };

const parse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

export type ExtractResult = { fields: FlyerFields | null; reason?: string; error?: string };

const inFlight = new Map<string, Promise<ExtractResult>>();

/** Reads an upload with Claude once and caches the result on the upload (one read at a time per upload). */
export function extractUpload(uploadId: string): Promise<ExtractResult> {
  let p = inFlight.get(uploadId);
  if (!p) {
    p = readUpload(uploadId).finally(() => inFlight.delete(uploadId));
    inFlight.set(uploadId, p);
  }
  return p;
}

async function readUpload(uploadId: string): Promise<ExtractResult> {
  if (!aiEnabled()) return { fields: null, reason: "Auto-fill isn't switched on — fill in the details below." };
  const cached = db().prepare("SELECT extracted_json FROM uploads WHERE id = ?").get(uploadId) as { extracted_json: string | null } | undefined;
  if (!cached) return { fields: null, error: "Upload not found" };
  if (cached.extracted_json) return { fields: JSON.parse(cached.extracted_json) as FlyerFields };
  const image = await readFlyer(uploadId);
  if (!image) return { fields: null, error: "Upload not found" };
  const venues = db().prepare("SELECT slug, name FROM venues WHERE is_demo = 0 ORDER BY name").all() as { slug: string; name: string }[];
  try {
    const fields = await extractFlyer(image, venues);
    db().prepare("UPDATE uploads SET extracted_json = ? WHERE id = ?").run(JSON.stringify(fields), uploadId);
    return { fields };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { fields: null, reason: "Auto-fill is busy right now — fill in the details below." };
    if (e instanceof Anthropic.APIError) console.error(`extract: API error ${e.status}`, e.message);
    else console.error("extract failed", e);
    return { fields: null, reason: "We couldn't read this flyer automatically — fill in the details below." };
  }
}

export type Duplicate = { slug: string; title: string; status: string; why: "looks the same" | "same QR code" | "same name" };

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2));
function similarTitles(a: string, b: string) {
  const A = words(a);
  const B = words(b);
  if (A.size === 0 || B.size === 0) return false;
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / Math.min(A.size, B.size) >= 0.75 && shared >= 2;
}

/** Listings this photo is probably already on the site as: a near-identical image, the same QR code, or the same name. */
export function findDuplicates(uploadId: string): Duplicate[] {
  const d = db();
  const up = d.prepare("SELECT * FROM uploads WHERE id = ?").get(uploadId) as UploadRow | undefined;
  if (!up) return [];
  const links = parse<FlyerLink[]>(up.qr_json, []).map((l) => l.url);
  const title = parse<FlyerFields | null>(up.extracted_json, null)?.title ?? null;
  const events = d
    .prepare(
      `SELECT e.slug, e.title, e.status, e.links, u.phash, p.phash AS parent_phash
       FROM events e LEFT JOIN uploads u ON u.id = e.flyer LEFT JOIN uploads p ON p.id = u.parent
       WHERE e.status IN ('live', 'pending_payment', 'pending_review') AND (e.live_until IS NULL OR e.live_until >= ?)
         AND e.flyer IS NOT ? AND (u.parent IS NULL OR u.parent != ?)`,
    )
    .all(todayIST(), uploadId, uploadId) as { slug: string; title: string; status: string; links: string | null; phash: string | null; parent_phash: string | null }[];
  const out: Duplicate[] = [];
  for (const e of events) {
    const near = (h: string | null) => !!h && !!up.phash && hashDistance(h, up.phash) <= SAME_FLYER;
    const why: Duplicate["why"] | null =
      near(e.phash) || near(e.parent_phash)
        ? "looks the same"
        : links.length && parse<FlyerLink[]>(e.links, []).some((l) => links.includes(l.url))
          ? "same QR code"
          : title && similarTitles(title, e.title)
            ? "same name"
            : null;
    if (why) out.push({ slug: e.slug, title: e.title, status: e.status, why });
  }
  return out.slice(0, 3);
}

export function uploadInfo(uploadId: string) {
  const up = db().prepare("SELECT * FROM uploads WHERE id = ?").get(uploadId) as UploadRow | undefined;
  if (!up) return null;
  return { id: up.id, w: up.w, h: up.h, url: flyerUrl(up.id)!, links: parse<FlyerLink[]>(up.qr_json, []), duplicates: findDuplicates(up.id) };
}

export type QueueItem = {
  id: string;
  thumb: string;
  title: string | null;
  firstDate: string | null;
  links: number;
  duplicates: Duplicate[];
  similarInBatch: string[];
  created_at: string;
};

/** Batch-uploaded photos not yet posted (directly, or as a straightened copy) and not discarded. */
export function batchQueue(): QueueItem[] {
  const d = db();
  const rows = d
    .prepare(
      `SELECT u.* FROM uploads u
       WHERE u.batch = 1 AND u.dismissed = 0 AND u.created_at >= ?
         AND NOT EXISTS (SELECT 1 FROM events e JOIN uploads c ON c.id = e.flyer WHERE c.id = u.id OR c.parent = u.id)
       ORDER BY u.created_at`,
    )
    .all(addDays(todayIST(), -14)) as UploadRow[];
  return rows.map((u, i) => {
    const fields = parse<FlyerFields | null>(u.extracted_json, null);
    const firstDate = fields?.dates?.[0]?.date ?? null;
    return {
      id: u.id,
      thumb: flyerUrl(u.id, "sm")!,
      title: fields?.is_event_flyer === false ? null : (fields?.title ?? null),
      firstDate,
      links: parse<FlyerLink[]>(u.qr_json, []).length,
      duplicates: findDuplicates(u.id),
      // Two photos of the same flyer in one walk.
      similarInBatch: rows.slice(0, i).filter((o) => o.phash && u.phash && hashDistance(o.phash, u.phash) <= SAME_FLYER).map((o) => o.id),
      created_at: u.created_at,
    };
  });
}

export function dismissUpload(uploadId: string) {
  db().prepare("UPDATE uploads SET dismissed = 1 WHERE id = ?").run(uploadId);
}
