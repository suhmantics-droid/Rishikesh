// End-to-end-ish tests of the listing lifecycle against a throwaway SQLite database.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "pinned-test-"));
delete process.env.RESEND_API_KEY;
delete process.env.RAZORPAY_KEY_ID;
delete process.env.UPI_ID;
delete process.env.PAYMENTS_MODE;

// Imported after DATA_DIR is set, because the db module reads it on load.
const { db } = await import("../src/lib/db");
const { addDays, nowTimeIST, todayIST } = await import("../src/lib/dates");
const { saveFlyer } = await import("../src/lib/images");
const { createListing, ListingInput } = await import("../src/lib/listings");
const { adminPublish, approvePayment, payMode, startPayment, submitManualPayment } = await import("../src/lib/payments");
const { confirmSubscriber, subscribe } = await import("../src/lib/alerts");
const { queryWhatsOn } = await import("../src/lib/data");
const sharp = (await import("sharp")).default;

const today = todayIST();
let uploadId = "";

before(async () => {
  const png = await sharp({ create: { width: 400, height: 500, channels: 3, background: "#e8672a" } }).png().toBuffer();
  uploadId = (await saveFlyer(png)).id;
});

function listing(overrides: Record<string, unknown> = {}) {
  return ListingInput.parse({
    uploadId,
    title: "Test event",
    category: "music",
    dates: [{ date: addDays(today, 1), start_time: "19:00", end_time: "21:00" }],
    venue: { slug: "12-monks" },
    price_type: "free",
    organiser_email: "org@example.com",
    ...overrides,
  });
}

async function waitFor<T>(fn: () => T | undefined, ms = 2000): Promise<T> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 25));
  }
  throw new Error("timed out");
}

const status = (id: number) => db().prepare("SELECT status, live_until FROM events WHERE id = ?").get(id) as { status: string; live_until: string | null };

test("starter venues are seeded on first run", () => {
  const { n } = db().prepare("SELECT COUNT(*) AS n FROM venues").get() as { n: number };
  assert.ok(n >= 10);
});

test("a weekly event expands into each date, and stays off the board until paid", () => {
  const { id } = createListing(listing({ title: "Saturday kirtan", dates: [], weekly: { days: [6], start_time: "19:30", end_time: null, until: addDays(today, 20) } }));
  const dates = db().prepare("SELECT date FROM event_dates WHERE event_id = ?").all(id) as { date: string }[];
  assert.ok(dates.length === 3 || dates.length === 4, `got ${dates.length} Saturdays in 3 weeks`);
  assert.ok(dates.every((d) => new Date(d.date + "T00:00:00Z").getUTCDay() === 6));
  assert.equal(status(id).status, "pending_payment");
  assert.ok(!queryWhatsOn({ when: "all" }, today, "00:00").wall.some((e) => e.id === id));
});

test("cash flow: submit → admin approves → live for 4 weeks, followers emailed once", async () => {
  assert.equal(payMode(), "cash");
  await subscribe("fan@example.com", [{ kind: "venue", target: "aavya" }], false);
  const sub = db().prepare("SELECT token FROM subscribers WHERE email = ?").get("fan@example.com") as { token: string };
  confirmSubscriber(sub.token);

  const { id } = createListing(listing({ title: "Gong bath", category: "sound", venue: { slug: "aavya" } }));
  const event = db().prepare("SELECT * FROM events WHERE id = ?").get(id) as { id: number; slug: string; title: string; organiser_email: string; organiser_name: null };
  const pay = await startPayment(event, "new");
  assert.equal(pay.mode, "cash");

  submitManualPayment(pay.paymentId, id);
  assert.equal(status(id).status, "pending_review");

  approvePayment(pay.paymentId);
  assert.deepEqual(status(id), { status: "live", live_until: addDays(today, 27) });
  assert.equal(approvePayment(pay.paymentId), null, "approving twice is a no-op");

  await waitFor(() => db().prepare("SELECT 1 FROM emails WHERE to_addr = 'fan@example.com' AND subject LIKE 'New in Tapovan%'").get());
  const sent = db().prepare("SELECT COUNT(*) AS n FROM emails WHERE to_addr = 'fan@example.com' AND subject LIKE 'New in Tapovan%'").get() as { n: number };
  assert.equal(sent.n, 1);
  assert.ok(db().prepare("SELECT 1 FROM emails WHERE to_addr = 'org@example.com' AND subject LIKE 'Your flyer is live%'").get());
});

test("renewing adds 4 weeks after the current end date, and records the cash", () => {
  const { id } = createListing(listing({ title: "Renew me" }));
  adminPublish(id, 5000);
  assert.equal(status(id).live_until, addDays(today, 27));
  adminPublish(id, 5000);
  assert.equal(status(id).live_until, addDays(today, 55));
  const paid = db().prepare("SELECT SUM(amount_paise) AS s FROM payments WHERE event_id = ? AND status = 'approved'").get(id) as { s: number };
  assert.equal(paid.s, 10000);
});

test("filters: price, time of day, category, area and search", () => {
  const tomorrow = addDays(today, 1);
  const kirtan = createListing(listing({ title: "Riverside kirtan", category: "kirtan", venue: { slug: "social-soul-cafe" }, dates: [{ date: tomorrow, start_time: "19:00" }] })).id;
  const party = createListing(
    listing({ title: "Psy night", category: "party", price_type: "paid", price_min: 800, artists: ["DJ Test"], dates: [{ date: tomorrow, start_time: "22:00" }] }),
  ).id;
  adminPublish(kirtan, 0);
  adminPublish(party, 0);

  const ids = (f: Parameters<typeof queryWhatsOn>[0]) => queryWhatsOn({ when: "tomorrow", ...f }, today, "00:00").wall.map((e) => e.id);
  assert.ok(ids({ price: "free" }).includes(kirtan) && !ids({ price: "free" }).includes(party));
  assert.ok(!ids({ price: "u500" }).includes(party) && ids({ price: "u1000" }).includes(party));
  assert.deepEqual(ids({ time: "night" }), [party]);
  assert.ok(ids({ cat: ["kirtan"] }).every((id) => id === kirtan));
  assert.ok(ids({ area: "lower-tapovan" }).includes(kirtan) && !ids({ area: "lower-tapovan" }).includes(party));
  assert.deepEqual(ids({ q: "DJ Test" }), [party]);
});

test("today's events disappear once they're over", () => {
  const { id } = createListing(listing({ title: "Morning yoga", dates: [{ date: today, start_time: "07:00", end_time: "08:30" }] }));
  adminPublish(id, 0);
  const on = (now: string) => queryWhatsOn({ when: "today" }, today, now).agenda.some((e) => e.id === id);
  assert.ok(on("08:00"));
  assert.ok(!on("09:00"));
});

test("hidden listings never show", () => {
  const { id } = createListing(listing({ title: "Hide me" }));
  adminPublish(id, 0);
  db().prepare("UPDATE events SET status = 'hidden' WHERE id = ?").run(id);
  assert.ok(!queryWhatsOn({ when: "all" }, today, nowTimeIST()).wall.some((e) => e.id === id));
});

test("payment mode follows configuration", () => {
  process.env.UPI_ID = "pinned@upi";
  assert.equal(payMode(), "upi");
  process.env.PAYMENTS_MODE = "cash";
  assert.equal(payMode(), "cash");
  delete process.env.UPI_ID;
  delete process.env.PAYMENTS_MODE;
});
