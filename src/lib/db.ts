import Database from "better-sqlite3";
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
  end_time TEXT
);
CREATE INDEX IF NOT EXISTS event_dates_date ON event_dates(date);
CREATE INDEX IF NOT EXISTS event_dates_event ON event_dates(event_id);

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

function open() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const db = new Database(path.join(DATA_DIR, "app.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(SCHEMA);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM venues").get() as { n: number };
  if (n === 0) {
    const insert = db.prepare(
      `INSERT INTO venues (slug, name, area, lat, lng, address, description)
       VALUES (@slug, @name, @area, @lat, @lng, @address, @description)`,
    );
    db.transaction(() => VENUE_SEED.forEach((v) => insert.run(v)))();
  }
  return db;
}

// One connection per server process; survive dev hot reloads.
const g = globalThis as unknown as { __pinnedDb?: Database.Database };
export function db(): Database.Database {
  if (!g.__pinnedDb) g.__pinnedDb = open();
  return g.__pinnedDb;
}
