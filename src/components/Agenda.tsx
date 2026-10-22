import Link from "next/link";
import type { AgendaItem } from "@/lib/data";
import { formatDayLong, formatTime } from "@/lib/dates";
import { flyerUrl, priceShort } from "@/lib/util";
import { CategoryTag } from "./FlyerCard";

/** Day-by-day list: the fastest way to answer "what's on tonight?". */
export function Agenda({ items, today }: { items: AgendaItem[]; today: string }) {
  const days = new Map<string, AgendaItem[]>();
  for (const i of items) days.set(i.occ.date, [...(days.get(i.occ.date) ?? []), i]);
  return (
    <div className="flex flex-col gap-6">
      {[...days.entries()].map(([date, list]) => (
        <section key={date}>
          <h2 className="sticky top-14 z-10 -mx-1 mb-2 bg-paper/95 px-1 py-2 font-display text-lg font-extrabold backdrop-blur">
            {formatDayLong(date, today)} <span className="text-sm font-semibold text-muted">· {list.length}</span>
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {list.map((e) => {
              const thumb = flyerUrl(e.flyer, "sm");
              return (
                <li key={`${e.id}-${e.occ.date}-${e.occ.start_time}`}>
                  <Link href={`/e/${e.slug}`} className="flex items-center gap-3 p-3 hover:bg-paper-2/60">
                    <div className="w-14 shrink-0 text-right">
                      <div className="font-display text-[15px] font-extrabold">{formatTime(e.occ.start_time) || "—"}</div>
                      {e.occ.end_time ? <div className="text-[11px] text-muted">to {formatTime(e.occ.end_time)}</div> : null}
                    </div>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-md object-cover object-top" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <CategoryTag cat={e.category} />
                      <div className="truncate font-bold">{e.title}</div>
                      <div className="truncate text-[13px] text-muted">
                        {e.venue.name}
                        {e.artists.length ? ` · ${e.artists.map((a) => a.name).join(", ")}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-[13px] font-semibold">{priceShort(e)}</div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
