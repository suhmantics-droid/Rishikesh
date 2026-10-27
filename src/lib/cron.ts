// Daily jobs, run inside the server process every 15 minutes (cheap no-ops most of the time):
//  - from 07:30 IST: "what's on today" digests (once per subscriber per day)
//  - renewal reminders to organisers two days before a listing expires
//  - "starting soon" reminders for flyers people saved to their plan (needs the 15-minute rhythm)
//  - deleting full-size upload photos after a few days (kept only for straightening)
// Also callable from /api/cron?key=CRON_SECRET — how it runs on Vercel, which has no long-running process.

import { sendDailyDigests, sendExpiryReminders } from "./alerts";
import { nowTimeIST } from "./dates";
import { deleteOrphans } from "./db";
import { pruneOriginals } from "./images";
import { sendPlanReminders, sendPushDigests } from "./push";

export async function runJobs({ force = false } = {}) {
  const reminders = await sendExpiryReminders();
  const morning = force || nowTimeIST() >= "07:30";
  const digests = morning ? await sendDailyDigests() : 0;
  const pushDigests = morning ? await sendPushDigests() : 0;
  const planReminders = await sendPlanReminders();
  const prunedOriginals = await pruneOriginals();
  await deleteOrphans();
  return { reminders, digests, pushDigests, planReminders, prunedOriginals };
}

let started = false;
export function startScheduler() {
  if (started || process.env.DISABLE_SCHEDULER === "1") return;
  started = true;
  const tick = () => runJobs().catch((e) => console.error("scheduled jobs failed", e));
  setTimeout(tick, 30_000);
  setInterval(tick, 15 * 60_000).unref();
}
