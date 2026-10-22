// Daily jobs, run inside the server process every 15 minutes (cheap no-ops most of the time):
//  - from 07:30 IST: "what's on today" digests (once per subscriber per day)
//  - renewal reminders to organisers two days before a listing expires
// Also callable from /api/cron?key=CRON_SECRET if you prefer an external scheduler.

import { sendDailyDigests, sendExpiryReminders } from "./alerts";
import { nowTimeIST } from "./dates";

export async function runJobs({ force = false } = {}) {
  const reminders = await sendExpiryReminders();
  const digests = force || nowTimeIST() >= "07:30" ? await sendDailyDigests() : 0;
  return { reminders, digests };
}

let started = false;
export function startScheduler() {
  if (started || process.env.DISABLE_SCHEDULER === "1") return;
  started = true;
  const tick = () => runJobs().catch((e) => console.error("scheduled jobs failed", e));
  setTimeout(tick, 30_000);
  setInterval(tick, 15 * 60_000).unref();
}
