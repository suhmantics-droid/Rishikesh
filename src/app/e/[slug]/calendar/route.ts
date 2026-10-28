import { getEventBySlug } from "@/lib/data";
import { todayIST } from "@/lib/dates";
import { icsCalendar } from "@/lib/ics";
import { SITE } from "@/lib/site";

// .ics download so a tourist can drop the event into Google/Apple Calendar in one tap.

export async function GET(_req: Request, ctx: RouteContext<"/e/[slug]/calendar">) {
  const { slug } = await ctx.params;
  const d = await getEventBySlug(slug);
  if (!d || d.event.status !== "live") return new Response("Not found", { status: 404 });
  const today = todayIST();
  const url = new URL(`/e/${d.event.slug}`, SITE.url).toString();
  const entries = d.dates
    .filter((x) => x.date >= today)
    .slice(0, 30)
    .map((o, i) => ({
      uid: `${d.event.slug}-${i}`,
      title: d.event.title,
      date: o.date,
      start_time: o.start_time,
      end_time: o.end_time,
      location: `${d.venue.name}, Tapovan, Rishikesh`,
      description: `${d.event.description ?? ""}\n\n${url}`,
      url,
    }));
  return new Response(icsCalendar(entries), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${d.event.slug}.ics"`,
    },
  });
}
