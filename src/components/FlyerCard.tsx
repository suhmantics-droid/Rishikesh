import Link from "next/link";
import type { EventCard } from "@/lib/data";
import { dateParts, formatTimeRange } from "@/lib/dates";
import { category } from "@/lib/site";
import { flyerUrl, priceShort } from "@/lib/util";

export function CategoryTag({ cat, className = "" }: { cat: string; className?: string }) {
  const c = category(cat);
  return (
    // Text stays in ink for legibility; the coloured dot carries the category.
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-ink-2 uppercase ${className}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
      {c.short}
    </span>
  );
}

/** A flyer pinned to the wall: the image is the hero, with a date sticker and the essentials beneath. */
export function FlyerCard({ e, today, priority = false }: { e: EventCard; today: string; priority?: boolean }) {
  const src = flyerUrl(e.flyer, "sm");
  const { wd, day, mon } = dateParts(e.next.date);
  const isToday = e.next.date === today;
  const price = priceShort(e);
  return (
    <Link
      href={`/e/${e.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card transition hover:-translate-y-0.5 hover:border-ganga/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-saffron"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-paper-2">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`Flyer: ${e.title}`}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center font-display text-lg font-semibold">{e.title}</div>
        )}
        <div
          className={`absolute top-2 left-2 rounded-xl px-1.5 py-1 text-center leading-none shadow-card sm:px-2 ${isToday ? "bg-saffron text-white" : "bg-card text-ink"}`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{isToday ? "Today" : wd}</div>
          <div className="font-display text-lg font-semibold sm:text-xl">{day}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{mon}</div>
        </div>
        {e.featured ? (
          <span className="absolute top-2 right-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-paper uppercase">Featured</span>
        ) : null}
        {e.is_demo ? (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white uppercase">Sample</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <CategoryTag cat={e.category} />
        <h3 className="line-clamp-2 font-display text-[15px] leading-snug font-semibold">{e.title}</h3>
        <p className="line-clamp-1 text-[13px] text-muted">{e.venue.name}</p>
        <div className="mt-auto flex items-center justify-between pt-1 text-[13px] font-semibold">
          <span>{formatTimeRange(e.next.start_time, e.next.end_time) || "All day"}</span>
          <span className={price === "Free" || price === "Donation" ? "text-ganga" : ""}>{price}</span>
        </div>
        {e.dates_in_range > 1 ? <p className="text-[12px] text-muted">+{e.dates_in_range - 1} more date{e.dates_in_range > 2 ? "s" : ""}</p> : null}
      </div>
    </Link>
  );
}

export function FlyerGrid({ items, today }: { items: EventCard[]; today: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((e, i) => (
        <FlyerCard key={e.id} e={e} today={today} priority={i < 4} />
      ))}
    </div>
  );
}
