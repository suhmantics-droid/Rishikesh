import { getEventBySlug } from "@/lib/data";
import { addDays, todayIST } from "@/lib/dates";
import { SITE } from "@/lib/site";

// .ics download so a tourist can drop the event into Google/Apple Calendar in one tap.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function stamp(date: string, time: string) {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

export async function GET(_req: Request, ctx: RouteContext<"/e/[slug]/calendar">) {
  const { slug } = await ctx.params;
  const d = await getEventBySlug(slug);
  if (!d || d.event.status !== "live") return new Response("Not found", { status: 404 });
  const today = todayIST();
  const url = new URL(`/e/${d.event.slug}`, SITE.url).toString();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${SITE.name}//${SITE.place}//EN`, "CALSCALE:GREGORIAN"];
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
  for (const [i, o] of d.dates.filter((x) => x.date >= today).slice(0, 30).entries()) {
    lines.push("BEGIN:VEVENT", `UID:${d.event.slug}-${i}@${new URL(SITE.url).hostname}`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
    if (o.start_time) {
      lines.push(`DTSTART;TZID=Asia/Kolkata:${stamp(o.date, o.start_time)}`);
      const end = o.end_time && o.end_time > o.start_time ? o.end_time : `${String(Math.min(23, Number(o.start_time.slice(0, 2)) + 2)).padStart(2, "0")}${o.start_time.slice(2)}`;
      lines.push(`DTEND;TZID=Asia/Kolkata:${stamp(o.date, end)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${o.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(o.date, 1).replace(/-/g, "")}`);
    }
    lines.push(
      `SUMMARY:${esc(d.event.title)}`,
      `LOCATION:${esc(`${d.venue.name}, Tapovan, Rishikesh`)}`,
      `DESCRIPTION:${esc(`${d.event.description ?? ""}\n\n${url}`)}`,
      `URL:${url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${d.event.slug}.ics"`,
    },
  });
}
