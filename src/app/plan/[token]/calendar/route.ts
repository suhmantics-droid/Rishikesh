import { connection } from "next/server";
import { db } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { icsCalendar } from "@/lib/ics";
import { SITE } from "@/lib/site";

// "My calendar": the flyers someone saved, as a calendar their phone subscribes to and re-checks.
export async function GET(_req: Request, ctx: RouteContext<"/plan/[token]/calendar">) {
  await connection();
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{24}$/.test(token)) return new Response("Not found", { status: 404 });
  const feed = (await db().prepare("SELECT slugs FROM calendar_feeds WHERE token = ?").get(token)) as { slugs: string } | undefined;
  if (!feed) return new Response("Not found", { status: 404 });
  const rows = (await db()
    .prepare(
      `SELECT e.slug, e.title, e.kind, e.description, v.name AS venue, d.date, d.start_time, d.end_time, d.label
       FROM events e JOIN venues v ON v.id = e.venue_id JOIN event_dates d ON d.event_id = e.id
       WHERE e.slug IN (SELECT value FROM json_each(?)) AND e.status = 'live' AND d.date >= ?
       ORDER BY d.date, COALESCE(d.start_time, '99:99')`,
    )
    .all(feed.slugs, todayIST())) as { slug: string; title: string; kind: string; description: string | null; venue: string; date: string; start_time: string | null; end_time: string | null; label: string | null }[];
  // A class timetable adds its next week of sessions rather than every session for a month.
  const seen = new Map<string, number>();
  const entries = rows
    .filter((r) => {
      const n = (seen.get(r.slug) ?? 0) + 1;
      seen.set(r.slug, n);
      return r.kind !== "classes" || n <= 7;
    })
    .slice(0, 200)
    .map((r) => {
      const url = new URL(`/e/${r.slug}`, SITE.url).toString();
      return {
        uid: `${r.slug}-${r.date}-${r.start_time ?? "day"}`,
        title: r.label ? `${r.label} (${r.title})` : r.title,
        date: r.date,
        start_time: r.start_time,
        end_time: r.end_time,
        location: `${r.venue}, Tapovan, Rishikesh`,
        description: `${r.description ?? ""}\n\n${url}`.trim(),
        url,
      };
    });
  return new Response(icsCalendar(entries, `My plan · ${SITE.name}`), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" },
  });
}
