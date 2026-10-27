import Link from "next/link";
import type { AgendaItem } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/dates";
import { flyerUrl, priceShort } from "@/lib/util";
import { CategoryTag } from "./FlyerCard";
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
            <h2 className={`${dayHeaders ? "" : "sr-only "}sticky top-14 z-10 -mx-1 mb-2 bg-paper/95 px-1 py-2 font-display text-lg font-semibold backdrop-blur`}>
              {formatDayLong(date, today)} <span className="text-sm font-semibold text-muted">· {list.length}</span>
            </h2>
            {events.length ? (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
                {events.map((e) => (
                  <EventRow key={`${e.id}-${e.occ.date}-${e.occ.start_time}`} e={e} />
                ))}
              </ul>
            ) : null}
            {classes.length ? (
              <details className={`group rounded-2xl border border-line bg-card/70 ${events.length ? "mt-2" : ""}`} open={classesOpen || !events.length}>
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-ink-2">
                  <span className="h-2 w-2 rounded-full bg-ganga" />
                  Drop-in classes · {classes.length}
                  <span className="ml-auto text-muted transition group-open:rotate-180" aria-hidden>
                    ▾
                  </span>
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {classes.map((e) => (
                    <li key={`${e.id}-${e.occ.date}-${e.occ.start_time}-${e.occ.label}`}>
                      <Link href={`/e/${e.slug}`} className="flex items-baseline gap-3 px-4 py-2 hover:bg-paper-2/60">
                        <span className="w-14 shrink-0 text-right font-display text-[14px] font-semibold">{formatTime(e.occ.start_time) || "—"}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px]">
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
      <Link href={`/e/${e.slug}`} className="flex items-center gap-3 p-3 hover:bg-paper-2/60">
        <div className="w-14 shrink-0 text-right">
          <div className="font-display text-[15px] font-semibold">{formatTime(e.occ.start_time) || "—"}</div>
          {e.occ.end_time ? <div className="text-[11px] text-muted">to {formatTime(e.occ.end_time)}</div> : null}
        </div>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-md object-cover object-top" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CategoryTag cat={e.category} />
            <LiveBadge date={e.occ.date} start={e.occ.start_time} end={e.occ.end_time} />
          </div>
          <div className="truncate font-bold">{e.title}</div>
          <div className="truncate text-[13px] text-muted">
            {e.venue.name}
            {e.artists.length ? ` · ${e.artists.map((a) => a.name).join(", ")}` : ""}
          </div>
          <WalkTime lat={e.venue.lat} lng={e.venue.lng} className="text-[12px] font-semibold text-ganga" />
        </div>
        <div className="shrink-0 text-[13px] font-semibold">{priceShort(e)}</div>
      </Link>
    </li>
  );
}
