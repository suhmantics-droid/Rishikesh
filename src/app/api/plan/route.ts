import { connection } from "next/server";
import { db } from "@/lib/db";
import { nowTimeIST, todayIST } from "@/lib/dates";
import { flyerUrl, priceShort } from "@/lib/util";

// The upcoming sessions of the flyers someone saved to their plan (kept in their browser, no account).
export async function GET(req: Request) {
  await connection();
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "").split(",").filter((s) => /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 60);
  if (!slugs.length) return Response.json({ items: [] });
  const today = todayIST();
  const now = nowTimeIST();
  const rows = (await db()
    .prepare(
      `SELECT e.slug, e.title, e.kind, e.category, e.flyer, e.price_type, e.price_min, e.price_max, v.name AS venue, v.lat, v.lng,
              d.date, d.start_time, d.end_time, d.label
       FROM events e JOIN venues v ON v.id = e.venue_id JOIN event_dates d ON d.event_id = e.id
       WHERE e.slug IN (SELECT value FROM json_each(?)) AND e.status = 'live' AND d.date >= ?
       ORDER BY d.date, COALESCE(d.start_time, '99:99')`,
    )
    .all(JSON.stringify(slugs), today)) as Record<string, string | number | null>[];
  // Timetables contribute only their next few sessions; events every date.
  const seen = new Map<string, number>();
  const items = rows
    .filter((r) => !(r.date === today && r.end_time && String(r.end_time) < now))
    .filter((r) => {
      const n = (seen.get(String(r.slug)) ?? 0) + 1;
      seen.set(String(r.slug), n);
      return r.kind !== "classes" || n <= 3;
    })
    .slice(0, 120)
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      kind: r.kind,
      category: r.category,
      thumb: flyerUrl(r.flyer as string | null, "sm"),
      price: priceShort(r as { price_type: string; price_min: number | null; price_max: number | null }),
      venue: r.venue,
      lat: r.lat,
      lng: r.lng,
      date: r.date,
      start_time: r.start_time,
      end_time: r.end_time,
      label: r.label,
    }));
  const live = new Set(rows.map((r) => r.slug));
  return Response.json({ items, gone: slugs.filter((s) => !live.has(s)) });
}
