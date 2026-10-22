// Privacy-friendly analytics. Counts page views and unique visitors per day, and clicks per
// flyer. Visitors are counted with a hash of IP + browser + a daily salt: nothing that
// identifies a person is stored, the hashes are thrown away after a day, and no cookies are set.

import crypto from "node:crypto";
import { db } from "./db";
import { addDays, todayIST } from "./dates";

export const CLICK_KINDS = ["view", "whatsapp", "directions", "calendar", "share", "booking", "instagram", "interested"] as const;
export type ClickKind = (typeof CLICK_KINDS)[number];

function bump(day: string, metric: string) {
  db()
    .prepare("INSERT INTO daily_stats (day, metric, n) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1")
    .run(day, metric);
}

export function recordPageview(ip: string, userAgent: string) {
  const day = todayIST();
  const salt = `${day}:${process.env.SESSION_SECRET ?? "pinned"}`;
  const hash = crypto.createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 24);
  const d = db();
  d.transaction(() => {
    bump(day, "pageviews");
    const fresh = d.prepare("INSERT OR IGNORE INTO visitor_hashes (day, hash) VALUES (?, ?)").run(day, hash).changes > 0;
    if (fresh) bump(day, "visitors");
    d.prepare("DELETE FROM visitor_hashes WHERE day < ?").run(addDays(day, -1));
  })();
}

export function recordEventClick(eventId: number, kind: ClickKind) {
  const d = db();
  if (!d.prepare("SELECT 1 FROM events WHERE id = ?").get(eventId)) return;
  d.prepare("INSERT INTO event_stats (event_id, kind, n) VALUES (?, ?, 1) ON CONFLICT(event_id, kind) DO UPDATE SET n = n + 1").run(eventId, kind);
  if (kind === "view") d.prepare("UPDATE events SET views = views + 1 WHERE id = ?").run(eventId);
  bump(todayIST(), kind === "view" ? "flyer_views" : "flyer_actions");
}

export function eventStats(eventId: number): Record<string, number> {
  const rows = db().prepare("SELECT kind, n FROM event_stats WHERE event_id = ?").all(eventId) as { kind: string; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
}

/** Last `days` days of visitors, page views, flyer views and flyer actions, oldest first. */
export function dailySeries(days = 14) {
  const today = todayIST();
  const from = addDays(today, -(days - 1));
  const rows = db().prepare("SELECT day, metric, n FROM daily_stats WHERE day >= ?").all(from) as { day: string; metric: string; n: number }[];
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    const get = (m: string) => rows.find((r) => r.day === day && r.metric === m)?.n ?? 0;
    return { day, visitors: get("visitors"), pageviews: get("pageviews"), flyerViews: get("flyer_views"), actions: get("flyer_actions") };
  });
}
