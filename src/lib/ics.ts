// Calendar files (.ics) and "add to Google Calendar" links. Times on the site are Tapovan local time (IST).

import { addDays } from "./dates";
import { SITE } from "./site";

export type CalendarEntry = {
  uid: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  description: string;
  url: string;
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const compact = (date: string, time: string) => `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;

/** An end time to show when the flyer gives none: two hours after the start, within the same day. */
function endOf(start: string, end: string | null) {
  return end && end > start ? end : `${String(Math.min(23, Number(start.slice(0, 2)) + 2)).padStart(2, "0")}${start.slice(2)}`;
}

/** A whole calendar. `name` makes it a subscribable feed (calendar apps show it and re-check it every few hours). */
export function icsCalendar(entries: CalendarEntry[], name?: string) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${SITE.name}//${SITE.place}//EN`, "CALSCALE:GREGORIAN"];
  if (name) lines.push("METHOD:PUBLISH", `X-WR-CALNAME:${esc(name)}`, "X-WR-TIMEZONE:Asia/Kolkata", "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H");
  lines.push(
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "END:STANDARD",
    "END:VTIMEZONE",
  );
  const stamp = `${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
  for (const e of entries) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}@${new URL(SITE.url).hostname}`, `DTSTAMP:${stamp}`);
    if (e.start_time) {
      lines.push(`DTSTART;TZID=Asia/Kolkata:${compact(e.date, e.start_time)}`, `DTEND;TZID=Asia/Kolkata:${compact(e.date, endOf(e.start_time, e.end_time))}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(e.date, 1).replace(/-/g, "")}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`, `LOCATION:${esc(e.location)}`, `DESCRIPTION:${esc(e.description)}`, `URL:${e.url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Opens Google Calendar with the event filled in, ready to save. */
export function googleCalendarLink(e: Omit<CalendarEntry, "uid">) {
  const dates = e.start_time
    ? `${compact(e.date, e.start_time)}/${compact(e.date, endOf(e.start_time, e.end_time))}`
    : `${e.date.replace(/-/g, "")}/${addDays(e.date, 1).replace(/-/g, "")}`;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates, ctz: "Asia/Kolkata", location: e.location, details: e.description });
  return `https://calendar.google.com/calendar/render?${q}`;
}
