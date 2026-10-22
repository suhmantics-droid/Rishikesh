// Phone notifications and analytics against a throwaway database. Push delivery is captured
// by swapping the transport, so nothing is sent to real push services.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { before, test } from "node:test";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "pinned-push-"));

const { db } = await import("../src/lib/db");
const { addDays, todayIST } = await import("../src/lib/dates");
const { saveFlyer } = await import("../src/lib/images");
const { createListing, ListingInput } = await import("../src/lib/listings");
const { adminPublish } = await import("../src/lib/payments");
const push = await import("../src/lib/push");
const stats = await import("../src/lib/stats");
const sharp = (await import("sharp")).default;

const today = todayIST();
let uploadId = "";
const sent: { endpoint: string; title: string; url: string }[] = [];
let failWith: number | null = null;

before(async () => {
  const png = await sharp({ create: { width: 300, height: 400, channels: 3, background: "#0f6e6e" } }).png().toBuffer();
  uploadId = (await saveFlyer(png)).id;
  push.transport.send = async (row, payload) => {
    if (failWith) throw Object.assign(new Error("push service"), { statusCode: failWith });
    sent.push({ endpoint: row.endpoint, title: payload.title, url: payload.url });
    return 201;
  };
});

const listing = (o: Record<string, unknown>) =>
  ListingInput.parse({
    uploadId,
    title: "Gong bath",
    category: "sound",
    dates: [{ date: addDays(today, 2), start_time: "18:00" }],
    venue: { slug: "aavya" },
    price_type: "paid",
    price_min: 500,
    artists: ["Test Healer"],
    organiser_email: "org@example.com",
    ...o,
  });

const fakeSub = (n: number) => ({ endpoint: `https://push.example.com/${n}`, keys: { p256dh: "p".repeat(20), auth: "a".repeat(10) } });

async function settle() {
  await new Promise((r) => setTimeout(r, 150)); // onPublished runs in the background
}

test("VAPID keys are generated once and reused", () => {
  const a = push.vapidPublicKey();
  assert.ok(a.length > 60);
  assert.equal(push.vapidPublicKey(), a);
});

test("followers of an artist get one notification when the flyer goes live", async () => {
  push.savePushSubscription(fakeSub(1), [{ kind: "artist", target: "test-healer" }], false);
  push.savePushSubscription(fakeSub(2), [{ kind: "category", target: "party" }], false); // not a match
  const { id, slug } = createListing(listing({}));
  adminPublish(id, 5000);
  await settle();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].endpoint, "https://push.example.com/1");
  assert.match(sent[0].title, /Gong bath/);
  assert.equal(sent[0].url, `/e/${slug}`);

  adminPublish(id, 5000); // renewal: no repeat notification
  await settle();
  assert.equal(sent.length, 1);
});

test("a phone that unsubscribed (410) is forgotten", async () => {
  push.savePushSubscription(fakeSub(3), [{ kind: "venue", target: "12-monks" }], false);
  failWith = 410;
  const { id } = createListing(listing({ title: "Open mic", category: "comedy", venue: { slug: "12-monks" }, artists: [] }));
  adminPublish(id, 0);
  await settle();
  failWith = null;
  assert.equal(db().prepare("SELECT 1 FROM push_subscriptions WHERE endpoint = ?").get(fakeSub(3).endpoint), undefined);
});

test("morning digest goes out once per day, only when something is on", async () => {
  push.savePushSubscription(fakeSub(4), [], true);
  assert.equal(await push.sendPushDigests(), 0, "nothing on today yet");
  const { id } = createListing(listing({ title: "Sunset jam", category: "music", artists: [], dates: [{ date: today, start_time: "23:00" }] }));
  adminPublish(id, 0);
  await settle();
  const before = sent.length;
  assert.equal(await push.sendPushDigests(), 1);
  assert.match(sent[sent.length - 1].title, /Today in Tapovan/);
  assert.equal(await push.sendPushDigests(), 0, "not twice in a day");
  assert.equal(sent.length, before + 1);
});

test("visitors are counted once per day; page views every time", () => {
  stats.recordPageview("1.2.3.4", "Mozilla/5.0 phone");
  stats.recordPageview("1.2.3.4", "Mozilla/5.0 phone");
  stats.recordPageview("5.6.7.8", "Mozilla/5.0 laptop");
  const day = stats.dailySeries(1)[0];
  assert.equal(day.visitors, 2);
  assert.equal(day.pageviews, 3);
});

test("flyer clicks are counted per flyer", () => {
  const { id } = createListing(listing({ title: "Counted", artists: [] }));
  stats.recordEventClick(id, "view");
  stats.recordEventClick(id, "view");
  stats.recordEventClick(id, "directions");
  stats.recordEventClick(id, "interested");
  assert.deepEqual(stats.eventStats(id), { view: 2, directions: 1, interested: 1 });
  assert.equal((db().prepare("SELECT views FROM events WHERE id = ?").get(id) as { views: number }).views, 2);
  stats.recordEventClick(999999, "view"); // unknown flyer: ignored, no crash
});
