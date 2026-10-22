// Alerts: people follow venues, artists or categories and get an email when a new flyer
// matching them goes live, plus an optional "what's on today" digest each morning.

import { z } from "zod";
import { db } from "./db";
import { addDays, formatDayLong, formatTimeRange, todayIST } from "./dates";
import { button, emailLayout, sendEmail } from "./email";
import { getEventById } from "./data";
import { category, SITE } from "./site";
import { escapeHtml, flyerUrl, priceLabel, token } from "./util";

export const FollowSchema = z
  .array(z.object({ kind: z.enum(["venue", "artist", "category"]), target: z.string().min(1).max(80) }))
  .max(200);
export type Follow = z.infer<typeof FollowSchema>[number];

type Subscriber = { id: number; email: string; token: string; confirmed: number; daily_digest: number; last_digest_on: string | null };

const abs = (p: string) => new URL(p, SITE.url).toString();

export function getSubscriber(tok: string) {
  const s = db().prepare("SELECT * FROM subscribers WHERE token = ?").get(tok) as Subscriber | undefined;
  if (!s) return null;
  const follows = db().prepare("SELECT kind, target FROM follows WHERE subscriber_id = ? ORDER BY kind, target").all(s.id) as Follow[];
  return { ...s, follows };
}

function setFollows(subscriberId: number, follows: Follow[]) {
  const d = db();
  d.prepare("DELETE FROM follows WHERE subscriber_id = ?").run(subscriberId);
  const ins = d.prepare("INSERT OR IGNORE INTO follows (subscriber_id, kind, target) VALUES (?, ?, ?)");
  for (const f of follows.slice(0, 200)) ins.run(subscriberId, f.kind, f.target);
}

/** Creates or updates a subscription. New (or still unconfirmed) emails get a confirmation link. */
export async function subscribe(email: string, follows: Follow[], daily: boolean) {
  const d = db();
  const addr = email.trim().toLowerCase();
  let s = d.prepare("SELECT * FROM subscribers WHERE email = ?").get(addr) as Subscriber | undefined;
  if (!s) {
    d.prepare("INSERT INTO subscribers (email, token, daily_digest) VALUES (?, ?, ?)").run(addr, token(), daily ? 1 : 0);
    s = d.prepare("SELECT * FROM subscribers WHERE email = ?").get(addr) as Subscriber;
    setFollows(s.id, follows);
  } else if (!s.confirmed) {
    // Unconfirmed: whoever typed this email can't be trusted to overwrite; merge instead.
    const existing = (d.prepare("SELECT kind, target FROM follows WHERE subscriber_id = ?").all(s.id) as Follow[]) ?? [];
    setFollows(s.id, [...existing, ...follows]);
  } else {
    // Confirmed: email them their manage link rather than letting anyone change their alerts.
    await sendEmail(
      addr,
      `Your ${SITE.name} alerts`,
      emailLayout(
        "Manage your alerts",
        `<p>Someone (hopefully you) asked to change the alerts for this email. Use your private link:</p>${button(abs(`/alerts/${s.token}`), "Manage my alerts")}`,
      ),
    );
    return { status: "manage-link-sent" as const };
  }
  await sendEmail(
    addr,
    `Confirm your ${SITE.name} ${SITE.place} alerts`,
    emailLayout(
      "One tap to confirm",
      `<p>Confirm your email and we'll tell you when new flyers go up for the things you follow in Tapovan.</p>
       ${button(abs(`/api/alerts/confirm?t=${s.token}`), "Confirm alerts")}
       <p style="font-size:13px;color:#6b655a">Didn't ask for this? Ignore it and you won't hear from us.</p>`,
    ),
  );
  return { status: "confirmation-sent" as const };
}

export function confirmSubscriber(tok: string) {
  db().prepare("UPDATE subscribers SET confirmed = 1 WHERE token = ?").run(tok);
}

export function updateSubscriber(tok: string, follows: Follow[], daily: boolean) {
  const s = db().prepare("SELECT id FROM subscribers WHERE token = ?").get(tok) as { id: number } | undefined;
  if (!s) return false;
  db().prepare("UPDATE subscribers SET daily_digest = ? WHERE id = ?").run(daily ? 1 : 0, s.id);
  setFollows(s.id, follows);
  return true;
}

export function unsubscribe(tok: string) {
  db().prepare("DELETE FROM subscribers WHERE token = ?").run(tok);
}

function eventEmailBlock(detail: NonNullable<ReturnType<typeof getEventById>>) {
  const { event, venue, dates, artists } = detail;
  const today = todayIST();
  const next = dates.filter((d) => d.date >= today).slice(0, 3);
  const img = flyerUrl(event.flyer, "sm");
  return `
    ${img ? `<a href="${abs(`/e/${event.slug}`)}"><img src="${abs(img)}" alt="" width="240" style="display:block;border-radius:10px;max-width:100%;margin-bottom:12px"></a>` : ""}
    <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:${category(event.category).color}">${escapeHtml(category(event.category).label)}</div>
    <div style="font-size:18px;font-weight:800;margin:4px 0">${escapeHtml(event.title)}</div>
    <div style="color:#3d3a33">${next.map((d) => `${formatDayLong(d.date, today)} ${formatTimeRange(d.start_time, d.end_time)}`).join("<br>")}</div>
    <div style="color:#3d3a33">📍 ${escapeHtml(venue.name)} · ${escapeHtml(priceLabel(event))}</div>
    ${artists.length ? `<div style="color:#3d3a33">With ${escapeHtml(artists.map((a) => a.name).join(", "))}</div>` : ""}
    ${button(abs(`/e/${event.slug}`), "See the flyer")}`;
}

/** Emails every confirmed follower of this event's venue, artists or category — once per event. */
export async function notifyFollowers(eventId: number) {
  const detail = getEventById(eventId);
  if (!detail || !detail.isLive || detail.event.is_demo) return 0;
  const { event, venue, artists } = detail;
  const artistSlugs = artists.map((a) => a.slug);
  const subs = db()
    .prepare(
      `SELECT DISTINCT s.id, s.email, s.token, f.kind, f.target FROM subscribers s JOIN follows f ON f.subscriber_id = s.id
       WHERE s.confirmed = 1
         AND ((f.kind = 'venue' AND f.target = @venue) OR (f.kind = 'category' AND f.target = @cat)
              OR (f.kind = 'artist' AND f.target IN (SELECT value FROM json_each(@artists))))
         AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.subscriber_id = s.id AND n.event_id = @event)`,
    )
    .all({ venue: venue.slug, cat: event.category, artists: JSON.stringify(artistSlugs), event: eventId }) as {
    id: number;
    email: string;
    token: string;
    kind: string;
    target: string;
  }[];

  const bySub = new Map<number, (typeof subs)[number]>();
  // Prefer the most specific reason: artist > venue > category.
  const rank = { artist: 0, venue: 1, category: 2 } as Record<string, number>;
  for (const s of subs) {
    const cur = bySub.get(s.id);
    if (!cur || rank[s.kind] < rank[cur.kind]) bySub.set(s.id, s);
  }

  let sent = 0;
  for (const s of bySub.values()) {
    const why =
      s.kind === "artist"
        ? `You follow ${escapeHtml(artists.find((a) => a.slug === s.target)?.name ?? s.target)}`
        : s.kind === "venue"
          ? `You follow ${escapeHtml(venue.name)}`
          : `You follow ${escapeHtml(category(s.target).label)}`;
    db().prepare("INSERT OR IGNORE INTO notifications (subscriber_id, event_id) VALUES (?, ?)").run(s.id, eventId);
    await sendEmail(
      s.email,
      `New in Tapovan: ${event.title}`,
      emailLayout(`${why} — new flyer just went up`, eventEmailBlock(detail), `<a href="${abs(`/alerts/${s.token}`)}">Change or stop these alerts</a>`),
    );
    sent++;
  }
  db().prepare("UPDATE events SET followers_notified = 1 WHERE id = ?").run(eventId);
  return sent;
}

/** Called after a payment publishes or renews a listing. Never throws into the payment path. */
export function onPublished(eventId: number, firstPublish: boolean) {
  void (async () => {
    const detail = getEventById(eventId);
    if (!detail) return;
    const { event } = detail;
    if (event.organiser_email) {
      await sendEmail(
        event.organiser_email,
        firstPublish ? `Your flyer is live: ${event.title}` : `Renewed: ${event.title}`,
        emailLayout(
          firstPublish ? "Your flyer is live 🎉" : "Listing renewed",
          `<p><b>${escapeHtml(event.title)}</b> is on ${SITE.name} until <b>${formatDayLong(event.live_until as string)}</b>.</p>
           ${button(abs(`/e/${event.slug}`), "View your listing")}
           <p>Keep this private link to edit details, see views or renew:</p>
           <p><a href="${abs(`/manage/${event.manage_token}`)}">${abs(`/manage/${event.manage_token}`)}</a></p>`,
        ),
      );
    }
    if (firstPublish) await notifyFollowers(eventId);
  })().catch((e) => console.error("onPublished failed", e));
}

/** Morning digest of today's events for subscribers who asked for it. Runs once per day per person. */
export async function sendDailyDigests() {
  const today = todayIST();
  const items = db()
    .prepare(
      `SELECT e.id, e.slug, e.title, e.category, e.price_type, e.price_min, e.price_max, e.price_note,
              d.start_time, d.end_time, v.name AS venue
       FROM event_dates d JOIN events e ON e.id = d.event_id JOIN venues v ON v.id = e.venue_id
       WHERE e.status = 'live' AND e.live_until >= @today AND d.date = @today AND e.is_demo = 0
       ORDER BY COALESCE(d.start_time, '99:99')`,
    )
    .all({ today }) as {
    slug: string;
    title: string;
    category: string;
    price_type: string;
    price_min: number | null;
    price_max: number | null;
    price_note: string | null;
    start_time: string | null;
    end_time: string | null;
    venue: string;
  }[];
  if (items.length === 0) return 0;
  const subs = db()
    .prepare("SELECT * FROM subscribers WHERE confirmed = 1 AND daily_digest = 1 AND (last_digest_on IS NULL OR last_digest_on < ?)")
    .all(today) as Subscriber[];
  const list = items
    .map(
      (i) => `<tr><td style="padding:6px 8px 6px 0;white-space:nowrap;vertical-align:top;color:#6b655a">${formatTimeRange(i.start_time, i.end_time) || "All day"}</td>
        <td style="padding:6px 0"><a href="${abs(`/e/${i.slug}`)}" style="color:#1d1b16;font-weight:700">${escapeHtml(i.title)}</a><br>
        <span style="color:#6b655a;font-size:13px">${escapeHtml(i.venue)} · ${escapeHtml(priceLabel(i))}</span></td></tr>`,
    )
    .join("");
  for (const s of subs) {
    await sendEmail(
      s.email,
      `Today in Tapovan: ${items.length} thing${items.length === 1 ? "" : "s"} on`,
      emailLayout(`What's on today · ${formatDayLong(today)}`, `<table style="width:100%;border-collapse:collapse">${list}</table>${button(abs("/?when=today"), "Open the map")}`, `<a href="${abs(`/alerts/${s.token}`)}">Change or stop these emails</a>`),
    );
    db().prepare("UPDATE subscribers SET last_digest_on = ? WHERE id = ?").run(today, s.id);
  }
  return subs.length;
}

/** Two days before a listing expires, email the organiser a renew link. */
export async function sendExpiryReminders() {
  const target = addDays(todayIST(), 2);
  const rows = db()
    .prepare(
      `SELECT id, title, manage_token, organiser_email, live_until FROM events
       WHERE status = 'live' AND live_until = ? AND organiser_email IS NOT NULL AND is_demo = 0
         AND (reminder_sent_for IS NULL OR reminder_sent_for != live_until)`,
    )
    .all(target) as { id: number; title: string; manage_token: string; organiser_email: string; live_until: string }[];
  for (const r of rows) {
    await sendEmail(
      r.organiser_email,
      `Your flyer comes down in 2 days: ${r.title}`,
      emailLayout("Keep it pinned?", `<p><b>${escapeHtml(r.title)}</b> is listed until ${formatDayLong(r.live_until)}. Renew for another 4 weeks in one tap.</p>${button(abs(`/manage/${r.manage_token}`), "Renew listing")}`),
    );
    db().prepare("UPDATE events SET reminder_sent_for = live_until WHERE id = ?").run(r.id);
  }
  return rows.length;
}
