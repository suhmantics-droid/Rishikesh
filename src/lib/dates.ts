// All events happen in Rishikesh, so every date and time is stored as IST wall-clock
// strings: dates as YYYY-MM-DD and times as HH:MM. No time zone maths needed beyond "today".

import { SITE } from "./site";

export function todayIST(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE.timeZone }).format(now);
}

export function nowTimeIST(now = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SITE.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

function toUTC(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return toUTC(date).getUTCDay(); // 0 = Sunday
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toUTC(s).toISOString().slice(0, 10) === s;
}

export function isValidTime(s: unknown): s is string {
  return typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** Resolves a "when" filter into an inclusive date range. */
export function whenRange(when: string | undefined, today = todayIST()): { from: string; to: string } {
  if (when && isValidDate(when)) return { from: when, to: when };
  switch (when) {
    case "today":
    case "tonight":
      return { from: today, to: today };
    case "tomorrow": {
      const t = addDays(today, 1);
      return { from: t, to: t };
    }
    case "weekend": {
      // Friday to Sunday of this week; on a weekend day, from today to Sunday.
      const wd = weekday(today);
      const toSunday = (7 - wd) % 7;
      const from = wd === 0 || wd >= 5 ? today : addDays(today, 5 - wd);
      return { from, to: addDays(today, toSunday) };
    }
    case "week":
      return { from: today, to: addDays(today, 6) };
    default:
      return { from: today, to: addDays(today, 120) };
  }
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDay(date: string, today = todayIST()): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const d = toUTC(date);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

export function formatDayLong(date: string, today = todayIST()): string {
  const d = toUTC(date);
  const base = `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
  if (date === today) return `Today · ${base}`;
  if (date === addDays(today, 1)) return `Tomorrow · ${base}`;
  return base;
}

/** "Thu 22 Oct" — no "Today"/"Tomorrow" wording. */
export function formatDate(date: string): string {
  const d = toUTC(date);
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

export function dateParts(date: string) {
  const d = toUTC(date);
  return { wd: WD[d.getUTCDay()], day: d.getUTCDate(), mon: MON[d.getUTCMonth()] };
}

export function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${suffix}` : `${h12}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  if (!start) return "";
  return end ? `${formatTime(start)}–${formatTime(end)}` : formatTime(start);
}

/** Expands "every Tue and Sat until X" into concrete dates (capped). */
export function expandWeekly(start: string, until: string, days: number[], max = 400): string[] {
  const out: string[] = [];
  let d = start;
  while (d <= until && out.length < max) {
    if (days.includes(weekday(d))) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

// Weekdays in display order (Monday first), as 0 = Sunday … 6 = Saturday.
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_SHORT = WD;
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "Daily", "Mon–Sat", "Wed–Sun", "Thu & Sun", "Mon, Wed & Fri" for a set of weekdays. */
export function daysLabel(days: number[]): string {
  const set = new Set(days.filter((d) => d >= 0 && d <= 6));
  if (set.size === 0) return "";
  if (set.size === 7) return "Daily";
  const order = WEEK_ORDER.filter((d) => set.has(d));
  // A run of three or more consecutive days (Monday-first, wrapping past Sunday) reads as a range.
  if (order.length >= 3) {
    for (let start = 0; start < 7; start++) {
      const run = Array.from({ length: order.length }, (_, i) => WEEK_ORDER[(start + i) % 7]);
      if (run.every((d) => set.has(d))) return `${WD[run[0]]}–${WD[run[run.length - 1]]}`;
    }
  }
  const names = order.map((d) => WD[d]);
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}
