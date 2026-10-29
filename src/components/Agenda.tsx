import Link from "next/link";
import type { AgendaItem } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/dates";
import { flyerUrl } from "@/lib/util";
import { CategoryTag, priceOrNotListed } from "./FlyerCard";
import { Icon } from "./Icon";
import { LiveBadge, WalkTime } from "./Live";

/**
 * Day-by-day list: the fastest way to answer "what's on tonight?".
 * Events lead each day; regular drop-in classes sit in a compact list beneath, so a
 * busy yoga timetable never buries tonight's concert.
 */
export function Agenda({
  items,
  today,
  dayHeaders = true,
  classesOpen = false,
}: {
  items: AgendaItem[];
  today: string;
  dayHeaders?: boolean;
  classesOpen?: boolean;
}) {
  const days = new Map<string, AgendaItem[]>();
  for (const i of items) days.set(i.occ.date, [...(days.get(i.occ.date) ?? []), i]);
  return (
    <div className="flex flex-col gap-6">
      {[...days.entries()].map(([date, list]) => {
        const events = list.filter((e) => e.kind !== "classes");
        const classes = list.filter((e) => e.kind === "classes");
        return (
          <section key={date}>
            <h2 className={`${dayHeaders ? "" : "sr-only "}sticky top-16 z-10 -mx-1 mb-2 bg-wall/95 px-1 py-2 text-[19px] font-extrabold backdrop-blur lg:top-20`}>
              {formatDayLong(date, today)} <span className="text-[15px] font-semibold text-muted">· {list.length}</span>
            </h2>
            {events.length ? (
              <ul className="flex flex-col gap-2">
                {events.map((e) => (
                  <EventRow key={`${e.id}-${e.occ.date}-${e.occ.start_time}`} e={e} />
                ))}
              </ul>
            ) : null}
            {classes.length ? (
              <details className={`group bg-surface shadow-e1 ${events.length ? "mt-2" : ""}`} open={classesOpen || !events.length}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-[16px] font-bold">
                  <span className="h-2.5 w-2.5 rounded-full bg-act" aria-hidden />
                  Drop-in classes · {classes.length}
                  <Icon name="down" size={20} className="ml-auto transition group-open:rotate-180" />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {classes.map((e) => (
                    <li key={`${e.id}-${e.occ.date}-${e.occ.start_time}-${e.occ.label}`}>
                      <Link href={`/e/${e.slug}`} className="flex min-h-12 items-center gap-3 px-4 py-2 hover:bg-slip">
                        <span className="slip-time w-16 shrink-0 text-[15px]">{formatTime(e.occ.start_time) || "Time n/a"}</span>
                        <span className="min-w-0 flex-1 truncate text-[16px]">
                          <b>{e.occ.label ?? e.title}</b> <span className="text-muted">· {e.venue.name}</span>
                        </span>
                        <LiveBadge date={e.occ.date} start={e.occ.start_time} end={e.occ.end_time} className="shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function EventRow({ e }: { e: AgendaItem }) {
  const thumb = flyerUrl(e.flyer, "sm");
  return (
    <li>
      <Link href={`/e/${e.slug}`} className="flex items-center gap-3 bg-surface p-3 shadow-e1 hover:bg-slip">
        <div className="w-16 shrink-0">
          <div className="slip-time text-[16px]">{formatTime(e.occ.start_time) || "Time n/a"}</div>
          {e.occ.end_time ? <div className="text-[14px] text-muted">to {formatTime(e.occ.end_time)}</div> : null}
        </div>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="h-16 w-12 shrink-0 object-cover object-top shadow-e1" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CategoryTag cat={e.category} />
            <LiveBadge date={e.occ.date} start={e.occ.start_time} end={e.occ.end_time} />
          </div>
          <div className="slip-name truncate">{e.title}</div>
          <div className="truncate text-[15px] text-ink-2">
            {e.venue.name}
            {e.artists.length ? ` · ${e.artists.map((a) => a.name).join(", ")}` : ""}
          </div>
          <WalkTime lat={e.venue.lat} lng={e.venue.lng} className="text-[14px] font-semibold text-act-ink" />
        </div>
        <div className="shrink-0 text-[15px] font-bold">{priceOrNotListed(e)}</div>
      </Link>
    </li>
  );
}
