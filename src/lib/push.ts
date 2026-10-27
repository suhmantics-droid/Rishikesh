// Phone notifications (Web Push). No account or email needed: the browser gives us an
// endpoint, we store it with what the person follows, and notify it when a matching flyer
// goes live. Works on Android browsers and on iPhone once the site is added to the home screen.

import webpush from "web-push";
import { db } from "./db";
import { getEventById } from "./data";
import { addDays, formatDayLong, formatTime, nowTimeIST, todayIST } from "./dates";
import { SITE } from "./site";
import { flyerUrl, priceShort } from "./util";
import type { Follow } from "./alerts";

type PushRow = { id: number; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url: string; image?: string; tag?: string };

/** VAPID keys identify this server to the browsers' push services. Generated once, kept in the database. */
async function vapid() {
  const get = async (k: string) => ((await db().prepare("SELECT value FROM settings WHERE key = ?").get(k)) as { value: string } | undefined)?.value;
  let publicKey = await get("_VAPID_PUBLIC");
  let privateKey = await get("_VAPID_PRIVATE");
  if (!publicKey || !privateKey) {
    ({ publicKey, privateKey } = webpush.generateVAPIDKeys());
    const put = db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    await put.run("_VAPID_PUBLIC", publicKey);
    await put.run("_VAPID_PRIVATE", privateKey);
  }
  return { publicKey, privateKey };
}

export async function vapidPublicKey() {
  return (await vapid()).publicKey;
}

/** Swappable so tests can capture notifications instead of sending them. */
export const transport = {
  async send(row: PushRow, payload: PushPayload): Promise<number> {
    const { publicKey, privateKey } = await vapid();
    const subject = SITE.url.startsWith("https://") ? SITE.url : "mailto:alerts@suhmantics.com";
    const res = await webpush.sendNotification(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      JSON.stringify(payload),
      { TTL: 6 * 60 * 60, vapidDetails: { subject, publicKey, privateKey } },
    );
    return res.statusCode;
  },
};

async function deliver(row: PushRow, payload: PushPayload) {
  try {
    await transport.send(row, payload);
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 404/410: the person turned notifications off or uninstalled — forget the endpoint.
    if (status === 404 || status === 410) await db().prepare("DELETE FROM push_subscriptions WHERE id = ?").run(row.id);
    else console.error("push failed", status ?? e);
    return false;
  }
}

export async function savePushSubscription(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  follows: Follow[],
  daily: boolean,
) {
  return await db().transaction(async (d) => {
    await d.prepare(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, daily_digest) VALUES (?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, daily_digest = excluded.daily_digest`,
    ).run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, daily ? 1 : 0);
    const { id } = (await d.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(sub.endpoint)) as { id: number };
    await d.prepare("DELETE FROM push_follows WHERE push_id = ?").run(id);
    const ins = d.prepare("INSERT OR IGNORE INTO push_follows (push_id, kind, target) VALUES (?, ?, ?)");
    for (const f of follows.slice(0, 200)) await ins.run(id, f.kind, f.target);
    return id;
  });
}

export async function removePushSubscription(endpoint: string) {
  await db().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

/** Notifies every phone following this flyer's venue, artists or category — once per flyer. */
export async function pushFollowers(eventId: number) {
  const detail = await getEventById(eventId);
  if (!detail || !detail.isLive || detail.event.is_demo) return 0;
  const { event, venue, artists, dates } = detail;
  const rows = (await db()
    .prepare(
      `SELECT DISTINCT p.id, p.endpoint, p.p256dh, p.auth FROM push_subscriptions p JOIN push_follows f ON f.push_id = p.id
       WHERE ((f.kind = 'venue' AND f.target = @venue) OR (f.kind = 'category' AND f.target = @cat)
              OR (f.kind = 'artist' AND f.target IN (SELECT value FROM json_each(@artists))))
         AND NOT EXISTS (SELECT 1 FROM push_notified n WHERE n.push_id = p.id AND n.event_id = @event)`,
    )
    .all({ venue: venue.slug, cat: event.category, artists: JSON.stringify(artists.map((a) => a.slug)), event: eventId })) as PushRow[];
  if (!rows.length) return 0;
  const today = todayIST();
  const next = dates.find((x) => x.date >= today);
  const payload: PushPayload = {
    title: `New in Tapovan: ${event.title}`,
    body: [next ? `${formatDayLong(next.date, today)} ${formatTime(next.start_time)}`.trim() : null, venue.name, priceShort(event) || null]
      .filter(Boolean)
      .join(" · "),
    url: `/e/${event.slug}`,
    image: flyerUrl(event.flyer, "sm") ?? undefined,
    tag: `event-${event.id}`,
  };
  let sent = 0;
  for (const row of rows) {
    await db().prepare("INSERT OR IGNORE INTO push_notified (push_id, event_id) VALUES (?, ?)").run(row.id, eventId);
    if (await deliver(row, payload)) sent++;
  }
  return sent;
}

/** Morning "what's on today" notification for phones that asked for it. */
export async function sendPushDigests() {
  const today = todayIST();
  const items = (await db()
    .prepare(
      `SELECT e.title FROM event_dates d JOIN events e ON e.id = d.event_id
       WHERE e.status = 'live' AND e.live_until >= @today AND d.date = @today AND e.is_demo = 0 AND e.kind != 'classes'
       ORDER BY COALESCE(d.start_time, '99:99')`,
    )
    .all({ today })) as { title: string }[];
  if (!items.length) return 0;
  const rows = (await db()
    .prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE daily_digest = 1 AND (last_digest_on IS NULL OR last_digest_on < ?)")
    .all(today)) as PushRow[];
  const payload: PushPayload = {
    title: `Today in Tapovan: ${items.length} thing${items.length === 1 ? "" : "s"} on`,
    body: items.slice(0, 3).map((i) => i.title).join(" · ") + (items.length > 3 ? " …" : ""),
    url: "/?when=today",
    tag: `digest-${today}`,
  };
  for (const row of rows) {
    await db().prepare("UPDATE push_subscriptions SET last_digest_on = ? WHERE id = ?").run(today, row.id);
    await deliver(row, payload);
  }
  return rows.length;
}

// ---- "My plan" reminders ----

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/**
 * Sets (or with on=false clears) a reminder for the next session of a saved flyer that hasn't started.
 * Returns when it will fire, or null if there's nothing timed coming up or this phone isn't subscribed.
 */
export async function setReminder(endpoint: string, slug: string, on: boolean, now = { date: todayIST(), time: nowTimeIST() }) {
  const d = db();
  const sub = (await d.prepare("SELECT id FROM push_subscriptions WHERE endpoint = ?").get(endpoint)) as { id: number } | undefined;
  const ev = (await d.prepare("SELECT id FROM events WHERE slug = ? AND status = 'live'").get(slug)) as { id: number } | undefined;
  if (!sub || !ev) return null;
  if (!on) {
    await d.prepare("DELETE FROM push_reminders WHERE push_id = ? AND event_id = ?").run(sub.id, ev.id);
    return null;
  }
  const next = (await d
    .prepare(
      `SELECT date, start_time FROM event_dates WHERE event_id = ? AND start_time IS NOT NULL
         AND (date > ? OR (date = ? AND start_time > ?)) ORDER BY date, start_time LIMIT 1`,
    )
    .get(ev.id, now.date, now.date, now.time)) as { date: string; start_time: string } | undefined;
  if (!next) return null;
  await d.prepare(
    `INSERT INTO push_reminders (push_id, event_id, date, start_time) VALUES (?, ?, ?, ?)
     ON CONFLICT(push_id, event_id) DO UPDATE SET date = excluded.date, start_time = excluded.start_time, sent = 0`,
  ).run(sub.id, ev.id, next.date, next.start_time);
  return next;
}

/** Sends reminders for saved flyers starting within the next 75 minutes. Runs with the 15-minute jobs. */
export async function sendPlanReminders(now = { date: todayIST(), time: nowTimeIST() }) {
  const d = db();
  const rows = (await d
    .prepare(
      `SELECT r.push_id, r.event_id, r.date, r.start_time, p.id, p.endpoint, p.p256dh, p.auth, e.title, e.slug, e.flyer, v.name AS venue
       FROM push_reminders r JOIN push_subscriptions p ON p.id = r.push_id JOIN events e ON e.id = r.event_id JOIN venues v ON v.id = e.venue_id
       WHERE r.sent = 0 AND r.date = ? AND e.status = 'live'`,
    )
    .all(now.date)) as (PushRow & { push_id: number; event_id: number; date: string; start_time: string; title: string; slug: string; flyer: string | null; venue: string })[];
  let sent = 0;
  for (const r of rows) {
    const until = minutes(r.start_time) - minutes(now.time);
    if (until > 75) continue;
    await d.prepare("UPDATE push_reminders SET sent = 1 WHERE push_id = ? AND event_id = ?").run(r.push_id, r.event_id);
    if (until < -15) continue; // missed it (server was down): don't nag after the start
    const ok = await deliver(r, {
      title: until > 0 ? `Starting soon: ${r.title}` : `Starting now: ${r.title}`,
      body: `${formatTime(r.start_time)} at ${r.venue}${until > 0 ? ` — in about ${until >= 55 ? "an hour" : `${until} minutes`}` : ""}`,
      url: `/e/${r.slug}`,
      image: flyerUrl(r.flyer, "sm") ?? undefined,
      tag: `reminder-${r.event_id}`,
    });
    if (ok) sent++;
  }
  // Old reminders are done with.
  await d.prepare("DELETE FROM push_reminders WHERE date < ?").run(addDays(now.date, -1));
  return sent;
}
