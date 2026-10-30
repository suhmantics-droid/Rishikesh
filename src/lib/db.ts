// The database. On a server of your own it's a SQLite file in DATA_DIR; on Vercel (no disk that
// survives between requests) it's the same SQLite schema hosted by Turso — set TURSO_DATABASE_URL
// and TURSO_AUTH_TOKEN. Every query is async either way.

import { createClient, type Client, type InArgs, type InValue, type ResultSet } from "@libsql/client";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { VENUE_SEED } from "./venue-seed";

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS venues (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'other',
  lat REAL,
  lng REAL,
  coords_verified INTEGER NOT NULL DEFAULT 0,
  address TEXT,
  instagram TEXT,
  phone TEXT,
  description TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  instagram TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'event', -- 'event' (one-off / a few dates) or 'classes' (a regular timetable)
  schedule TEXT, -- JSON: one-off dates plus weekly sessions; event_dates is generated from it
  links TEXT, -- JSON: links read from the flyer's QR codes [{kind, url}]
  flyer TEXT,
  flyer_w INTEGER,
  flyer_h INTEGER,
  venue_id INTEGER NOT NULL REFERENCES venues(id),
  price_type TEXT NOT NULL DEFAULT 'unknown',
  price_min INTEGER,
  price_max INTEGER,
  price_note TEXT,
  contact_phone TEXT,
  contact_instagram TEXT,
  booking_url TEXT,
  organiser_name TEXT,
  organiser_email TEXT,
  manage_token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment',
  live_until TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  ai_extracted INTEGER NOT NULL DEFAULT 0,
  followers_notified INTEGER NOT NULL DEFAULT 0,
  reminder_sent_for TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS events_status ON events(status, live_until);

CREATE TABLE IF NOT EXISTS event_dates (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  label TEXT -- the class name, for sessions in a timetable
);
CREATE INDEX IF NOT EXISTS event_dates_date ON event_dates(date);
CREATE INDEX IF NOT EXISTS event_dates_event ON event_dates(event_id);

-- One class on a timetable (a "slot"): repeats on set weekdays at a set time. Each dated session in
-- event_dates points back to it (session_id), so a class can be saved and linked on its own. Kept in step
-- with events.schedule whenever the dates are rebuilt. Empty fields mean the flyer doesn't say.
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- order on the timetable
  label TEXT, -- the class name
  days TEXT NOT NULL, -- JSON weekdays, 0 = Sunday
  start_time TEXT,
  end_time TEXT,
  teacher_id INTEGER REFERENCES artists(id),
  style TEXT,
  level TEXT,
  price_type TEXT, -- null: the timetable's own price applies
  price_min INTEGER,
  booking_kind TEXT, -- 'walk_in' or 'prebook'; null: the timetable's, else "Ask the studio"
  booking_contact TEXT,
  until TEXT
);
CREATE INDEX IF NOT EXISTS sessions_event ON sessions(event_id);

CREATE TABLE IF NOT EXISTS event_artists (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, artist_id)
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  w INTEGER,
  h INTEGER,
  extracted_json TEXT,
  qr_json TEXT,
  phash TEXT, -- 64-bit difference hash (hex), to spot the same flyer uploaded twice
  batch INTEGER NOT NULL DEFAULT 0, -- 1 = from the admin's batch upload, waiting in the To do queue
  dismissed INTEGER NOT NULL DEFAULT 0,
  parent TEXT, -- for a straightened copy: the upload it was made from
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'new',
  amount_paise INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  order_id TEXT,
  payment_id TEXT,
  upi_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  confirmed INTEGER NOT NULL DEFAULT 0,
  daily_digest INTEGER NOT NULL DEFAULT 0,
  last_digest_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follows (
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  PRIMARY KEY (subscriber_id, kind, target)
);

CREATE TABLE IF NOT EXISTS notifications (
  subscriber_id INTEGER NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (subscriber_id, event_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Privacy-friendly analytics: daily counters, no cookies, no stored IPs.
CREATE TABLE IF NOT EXISTS daily_stats (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
);
CREATE TABLE IF NOT EXISTS visitor_hashes (
  day TEXT NOT NULL,
  hash TEXT NOT NULL,
  PRIMARY KEY (day, hash)
);
CREATE TABLE IF NOT EXISTS event_stats (
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, kind)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  daily_digest INTEGER NOT NULL DEFAULT 0,
  last_digest_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS push_follows (
  push_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  PRIMARY KEY (push_id, kind, target)
);
CREATE TABLE IF NOT EXISTS push_notified (
  push_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  PRIMARY KEY (push_id, event_id)
);

-- "My plan" reminders: a phone that saved a flyer gets a nudge about an hour before it starts.
CREATE TABLE IF NOT EXISTS push_reminders (
  push_id INTEGER NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (push_id, event_id)
);

-- "My calendar": a private link that turns someone's saved plan into a calendar subscription (no account).
CREATE TABLE IF NOT EXISTS calendar_feeds (
  token TEXT PRIMARY KEY,
  slugs TEXT NOT NULL, -- JSON array of the listing slugs saved on their phone
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS emails (
  id INTEGER PRIMARY KEY,
  to_addr TEXT NOT NULL,
  subject TEXT NOT NULL,
  html TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

const MIGRATIONS: [table: string, column: string, def: string][] = [
  ["events", "kind", "TEXT NOT NULL DEFAULT 'event'"],
  ["events", "schedule", "TEXT"],
  ["event_dates", "label", "TEXT"],
  ["events", "links", "TEXT"],
  ["uploads", "qr_json", "TEXT"],
  ["uploads", "phash", "TEXT"],
  ["uploads", "batch", "INTEGER NOT NULL DEFAULT 0"],
  ["uploads", "dismissed", "INTEGER NOT NULL DEFAULT 0"],
  ["uploads", "parent", "TEXT"],
  // Venues we recommend, and what Google Maps says about a place (copied by hand, with the date checked).
  ["venues", "recommended", "INTEGER NOT NULL DEFAULT 0"],
  ["venues", "kind", "TEXT"],
  ["venues", "website", "TEXT"],
  ["venues", "google_url", "TEXT"],
  ["venues", "google_rating", "REAL"],
  ["venues", "google_reviews", "INTEGER"],
  ["venues", "google_checked", "TEXT"],
  ["venues", "stay", "INTEGER NOT NULL DEFAULT 0"], // hostels, guesthouses: shown on the map as places to stay
  ["venues", "guide", "TEXT"], // 'eat' or 'wellness': in the guide (and on the map, zoomed in) even without a flyer
  ["events", "organiser_whatsapp", "TEXT"],
  ["events", "review_note", "TEXT"], // the question we asked the organiser when a flyer needs changes // private: how we tell the organiser it's checked. Never shown on the listing.
  ["event_dates", "session_id", "INTEGER"], // the timetable class (sessions.id) a dated session comes from
];

// Changes whenever the schema, a migration or the starter venues change, so a cold start only
// re-runs the setup below when there's something new (one query otherwise).
const SCHEMA_VERSION = createHash("sha1")
  .update(SCHEMA + JSON.stringify(MIGRATIONS) + JSON.stringify(VENUE_SEED))
  .digest("hex")
  .slice(0, 12);

/** A value a query can take. `undefined` is stored as NULL and booleans as 1/0. */
type Arg = InValue | undefined;
type Params = Arg[] | [Record<string, unknown>] | [Arg[]];
export type Row = Record<string, unknown>;
export type RunResult = { changes: number; lastInsertRowid: number };
type Executor = Pick<Client, "execute" | "executeMultiple">;

const clean = (v: Arg): InValue => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);

function toArgs(params: Params): InArgs {
  const [first] = params;
  if (params.length === 1 && Array.isArray(first)) return first.map(clean);
  const named =
    params.length === 1 &&
    first !== null &&
    typeof first === "object" &&
    !(first instanceof Uint8Array) &&
    !(first instanceof ArrayBuffer) &&
    !(first instanceof Date);
  if (named) return Object.fromEntries(Object.entries(first as Record<string, Arg>).map(([k, v]) => [k, clean(v)]));
  return (params as Arg[]).map(clean);
}

/** Rows as plain objects keyed by column name (a repeated name keeps the last value, as SQLite drivers do). */
function plain(rs: ResultSet): Row[] {
  return rs.rows.map((r) => {
    const o: Row = {};
    rs.columns.forEach((c, i) => {
      o[c] = r[i];
    });
    return o;
  });
}

/**
 * A local SQLite file is used through one connection (several can each keep an old snapshot of the
 * file). While a transaction holds it, other queries get TRANSACTION_ACTIVE: wait and try again.
 */
async function whenFree<T>(attempt: () => Promise<T>): Promise<T> {
  for (let wait = 5; ; wait = Math.min(wait * 2, 200)) {
    try {
      return await attempt();
    } catch (e) {
      if ((e as { code?: string }).code !== "TRANSACTION_ACTIVE" || wait >= 200) throw e;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

export class Statement {
  constructor(
    private readonly executor: () => Promise<Executor>,
    private readonly sql: string,
  ) {}
  private async execute(params: Params) {
    const executor = await this.executor();
    return whenFree(() => executor.execute({ sql: this.sql, args: toArgs(params) }));
  }
  async all<T = Row>(...params: Params): Promise<T[]> {
    return plain(await this.execute(params)) as T[];
  }
  async get<T = Row>(...params: Params): Promise<T | undefined> {
    return plain(await this.execute(params))[0] as T | undefined;
  }
  async run(...params: Params): Promise<RunResult> {
    const rs = await this.execute(params);
    return { changes: rs.rowsAffected, lastInsertRowid: Number(rs.lastInsertRowid ?? 0) };
  }
}

export class Db {
  constructor(
    private readonly executor: () => Promise<Executor>,
    private readonly isRoot: boolean,
  ) {}
  prepare(sql: string) {
    return new Statement(this.executor, sql);
  }
  async exec(sql: string) {
    const executor = await this.executor();
    await whenFree(() => executor.executeMultiple(sql));
  }
  /** Runs `fn` as one write transaction: all of it is saved, or (if it throws) none of it. Use only `tx` inside. */
  async transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    if (!this.isRoot) throw new Error("Transactions can't be nested");
    const { client } = await connection();
    const tx = await whenFree(() => client.transaction("write"));
    try {
      const out = await fn(new Db(async () => tx, false));
      await tx.commit();
      return out;
    } catch (e) {
      await tx.rollback().catch(() => {});
      throw e;
    } finally {
      tx.close();
    }
  }
}

async function setUp(client: Client, local: boolean) {
  if (local) await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON").catch(() => {});
  const current = await client.execute("SELECT value FROM settings WHERE key = '_SCHEMA_VERSION'").catch(() => null);
  if (current?.rows[0]?.[0] === SCHEMA_VERSION) return;

  await client.executeMultiple(SCHEMA);
  // Columns added after the first release. CREATE TABLE IF NOT EXISTS doesn't add them to an existing database.
  const columns = new Map<string, Set<string>>();
  for (const [table, column, def] of MIGRATIONS) {
    if (!columns.has(table)) columns.set(table, new Set(plain(await client.execute(`PRAGMA table_info(${table})`)).map((c) => String(c.name))));
    if (!columns.get(table)!.has(column)) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
  await client.execute("CREATE INDEX IF NOT EXISTS event_dates_session ON event_dates(session_id)");
  await backfillSessions(client);
  // Starter venues: added if missing, never overwritten (pins may have been corrected in Admin).
  await client.batch(
    VENUE_SEED.map((v) => ({
      sql: `INSERT OR IGNORE INTO venues (slug, name, area, lat, lng, coords_verified, address, description, instagram, recommended, kind,
              website, stay, guide, google_url, google_rating, google_reviews, google_checked)
            VALUES (@slug, @name, @area, @lat, @lng, @coords_verified, @address, @description, @instagram, @recommended, @kind,
              @website, @stay, @guide, @google_url, @google_rating, @google_reviews, @google_checked)`,
      args: toArgs([
        {
          ...v,
          coords_verified: v.coords_verified ? 1 : 0,
          recommended: typeof v.recommended === "number" ? v.recommended : v.recommended ? 1 : 0,
          kind: v.kind ?? null,
          instagram: v.instagram ?? null,
          stay: v.stay ? 1 : 0,
          guide: v.guide ?? null,
          website: v.website ?? null,
          google_url: v.google_url ?? null,
          google_rating: v.google_rating ?? null,
          google_reviews: v.google_reviews ?? null,
          google_checked: v.google_checked ?? null,
        },
      ]),
    })),
    "write",
  );
  // Details the starter list has gained since a venue was first added: filled in where blank, never
  // overwriting what was set in Admin.
  await client.batch(
    VENUE_SEED.map((v) => ({
      sql: `UPDATE venues SET instagram = COALESCE(instagram, @instagram), website = COALESCE(website, @website), kind = COALESCE(kind, @kind),
              guide = COALESCE(guide, @guide), google_url = COALESCE(google_url, @google_url), google_rating = COALESCE(google_rating, @google_rating),
              google_reviews = COALESCE(google_reviews, @google_reviews), google_checked = COALESCE(google_checked, @google_checked)
            WHERE slug = @slug`,
      args: toArgs([
        {
          slug: v.slug,
          instagram: v.instagram ?? null,
          website: v.website ?? null,
          kind: v.kind ?? null,
          guide: v.guide ?? null,
          google_url: v.google_url ?? null,
          google_rating: v.google_rating ?? null,
          google_reviews: v.google_reviews ?? null,
          google_checked: v.google_checked ?? null,
        },
      ]),
    })),
    "write",
  );
  // Pins since checked against the place's Google Maps listing replace an approximate one (never one verified in Admin).
  await client.batch(
    VENUE_SEED.filter((v) => v.coords_verified).map((v) => ({
      sql: "UPDATE venues SET lat = ?, lng = ?, area = ?, coords_verified = 1 WHERE slug = ? AND coords_verified = 0",
      args: [v.lat, v.lng, v.area, v.slug],
    })),
    "write",
  );
  // One-off corrections. yogupasana.com is an empty placeholder site.
  await client.execute("UPDATE venues SET website = NULL WHERE slug = 'yog-upasana' AND website = 'https://yogupasana.com'");
  // Yogamani's pin, added with its first flyer, is the one on its Google Maps listing.
  await client.execute("UPDATE venues SET coords_verified = 1 WHERE slug = 'yogamani' AND abs(lat - 30.1292388) < 0.00001 AND abs(lng - 78.321948) < 0.00001");
  await client.execute({ sql: "INSERT OR REPLACE INTO settings (key, value) VALUES ('_SCHEMA_VERSION', ?)", args: [SCHEMA_VERSION] });
}

/**
 * Timetables saved before sessions had their own table: each weekly session becomes a row, and the dates
 * already made from it point back to it. Once per timetable; the JSON schedule and the dates stay as they are.
 */
async function backfillSessions(client: Client) {
  const events = plain(
    await client.execute(
      `SELECT id, schedule FROM events WHERE schedule LIKE '%"days"%' AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.event_id = events.id)`,
    ),
  );
  for (const e of events) {
    let s: { sessions?: { days?: number[]; start_time?: string | null; end_time?: string | null; label?: string | null }[]; until?: string | null };
    try {
      s = JSON.parse(String(e.schedule));
    } catch {
      continue;
    }
    const tx = await client.transaction("write");
    try {
      for (const [position, x] of (s.sessions ?? []).entries()) {
        if (!x.days?.length) continue;
        const r = await tx.execute({
          sql: "INSERT INTO sessions (event_id, position, label, days, start_time, end_time, until) VALUES (?, ?, ?, ?, ?, ?, ?)",
          args: [Number(e.id), position, x.label ?? null, JSON.stringify(x.days), x.start_time ?? null, x.end_time ?? null, s.until ?? null],
        });
        await tx.execute({
          sql: `UPDATE event_dates SET session_id = ? WHERE event_id = ? AND session_id IS NULL AND start_time IS ? AND label IS ?
                  AND CAST(strftime('%w', date) AS INTEGER) IN (${x.days.map(() => "?").join(",")})`,
          args: [Number(r.lastInsertRowid), Number(e.id), x.start_time ?? null, x.label ?? null, ...x.days],
        });
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    } finally {
      tx.close();
    }
  }
}

/** The one-off move of timetable sessions into their own table. Setup runs it after a schema change; tests call it. */
export async function migrateSessions() {
  await backfillSessions((await connection()).client);
}

type Connection = { client: Client; ready: Promise<void> };

function connect(): Connection {
  const remote = process.env.TURSO_DATABASE_URL;
  if (remote) {
    const client = createClient({ url: remote, authToken: process.env.TURSO_AUTH_TOKEN });
    return { client, ready: setUp(client, false) };
  }
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = path.join(DATA_DIR, "app.db");
  // libsql wants a file: URL; on Windows a relative one avoids the drive letter.
  const url = "file:" + (process.platform === "win32" ? path.relative(process.cwd(), file).split(path.sep).join("/") : file);
  const client = createClient({ url, timeout: 5000, concurrency: 1 });
  return { client, ready: setUp(client, true) };
}

// One client per server process; survive dev hot reloads. A failed setup is retried on the next query.
const g = globalThis as unknown as { __pinnedDb?: Connection };
async function connection() {
  if (!g.__pinnedDb) {
    const c = connect();
    g.__pinnedDb = c;
    c.ready.catch(() => {
      if (g.__pinnedDb === c) g.__pinnedDb = undefined;
    });
  }
  const c = g.__pinnedDb;
  await c.ready;
  return c;
}

const root = new Db(async () => (await connection()).client, true);
export function db(): Db {
  return root;
}

/**
 * Removes rows a delete left behind. SQLite's ON DELETE CASCADE needs foreign keys switched on per
 * connection, which a hosted database reached over HTTP doesn't keep between requests.
 */
export async function deleteOrphans() {
  await db().exec(`
    DELETE FROM event_dates WHERE event_id NOT IN (SELECT id FROM events);
    DELETE FROM sessions WHERE event_id NOT IN (SELECT id FROM events);
    DELETE FROM event_artists WHERE event_id NOT IN (SELECT id FROM events) OR artist_id NOT IN (SELECT id FROM artists);
    DELETE FROM payments WHERE event_id NOT IN (SELECT id FROM events);
    DELETE FROM reports WHERE event_id NOT IN (SELECT id FROM events);
    DELETE FROM event_stats WHERE event_id NOT IN (SELECT id FROM events);
    DELETE FROM notifications WHERE event_id NOT IN (SELECT id FROM events) OR subscriber_id NOT IN (SELECT id FROM subscribers);
    DELETE FROM follows WHERE subscriber_id NOT IN (SELECT id FROM subscribers);
    DELETE FROM push_follows WHERE push_id NOT IN (SELECT id FROM push_subscriptions);
    DELETE FROM push_notified WHERE push_id NOT IN (SELECT id FROM push_subscriptions) OR event_id NOT IN (SELECT id FROM events);
    DELETE FROM push_reminders WHERE push_id NOT IN (SELECT id FROM push_subscriptions) OR event_id NOT IN (SELECT id FROM events);
  `);
}
