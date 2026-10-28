import Link from "next/link";
import type { EventCard } from "@/lib/data";
import { dateParts, formatDay, formatTime, formatTimeRange, WEEK_ORDER, WEEKDAY_SHORT, weekday } from "@/lib/dates";
import { category } from "@/lib/site";
import { flyerUrl, priceShort } from "@/lib/util";
import { LiveBadge } from "./Live";

export function CategoryTag({ cat, className = "" }: { cat: string; className?: string }) {
  const c = category(cat);
  return (
    // The word carries the category; the dot is a quick visual cue, ringed so it shows on any ground.
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase ${className}`}>
      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-ink" style={{ background: c.color }} />
      {c.short}
    </span>
  );
}

/** A small, stable tilt for each flyer (−1.2° to 1.2°), the same wherever it appears. */
export function tiltFor(id: number) {
  return (((id * 37) % 25) - 12) / 10;
}

/** Mon…Sun with the days that have sessions filled in; closed days struck through, today outlined. */
export function WeekStrip({ days, todayWd, size = "sm" }: { days: number[]; todayWd: number; size?: "sm" | "md" }) {
  const set = new Set(days);
  const box = size === "md" ? "h-6 w-6 text-[12px]" : "h-[19px] w-[19px] text-[11px]";
  return (
    <span className="flex gap-0.5" aria-label={`On ${WEEK_ORDER.filter((d) => set.has(d)).map((d) => WEEKDAY_SHORT[d]).join(", ")}`}>
      {WEEK_ORDER.map((d) => (
        <span
          key={d}
          aria-hidden
          className={`flex items-center justify-center rounded-[2px] font-extrabold ${box} ${
            set.has(d) ? "bg-act text-on-act" : "border border-line-strong text-muted line-through"
          } ${d === todayWd ? "outline-2 outline-offset-1 outline-ink" : ""}`}
        >
          {WEEKDAY_SHORT[d][0]}
        </span>
      ))}
    </span>
  );
}

export function DateBlock({ date, className = "" }: { date: string; className?: string }) {
  const { wd, day, mon } = dateParts(date);
  return (
    <span className={`flex shrink-0 flex-col items-center bg-ink px-2 py-1 leading-none text-wall ${className}`}>
      <span className="text-[11px] font-extrabold uppercase">{wd}</span>
      <span className="text-[21px] font-extrabold">{day}</span>
      <span className="text-[11px] font-extrabold uppercase">{mon}</span>
    </span>
  );
}

/** Where, and how sure we are of the spot. Never implies a precise pin we don't have. */
export function placeNote(v: { lat: number | null; coords_verified: number }) {
  if (v.lat == null) return "spot on request";
  if (!v.coords_verified) return "approx. spot";
  return null;
}

export function priceOrNotListed(e: Parameters<typeof priceShort>[0]) {
  return priceShort(e) || "Price not listed";
}

/** The taped slip: every fact you need, readable at a glance, without touching the artwork. */
export function Slip({ e, today, className = "", style }: { e: EventCard; today: string; className?: string; style?: React.CSSProperties }) {
  const classes = e.kind === "classes";
  const noTime = !e.next.start_time;
  const price = priceOrNotListed(e);
  const where = [e.venue.name, placeNote(e.venue)].filter(Boolean).join(" · ");
  const day = formatDay(e.next.date, today).toLowerCase();
  return (
    <span className={`slip relative flex flex-col gap-0.5 bg-slip px-2.5 pt-2.5 pb-2.5 text-slip-ink shadow-e1 ${noTime ? "border-[1.5px] border-dashed border-line-strong" : ""} ${className}`} style={style}>
      <span className="tape" aria-hidden />
      <LiveBadge date={e.next.date} start={e.next.start_time} end={e.next.end_time} className="mb-1 self-start" />
      {classes ? (
        <>
          <WeekStrip days={e.days} todayWd={weekday(today)} />
          <span className="slip-time mt-1">
            {noTime ? `${formatDay(e.next.date, today)} · time not listed` : `Next ${day} ${formatTime(e.next.start_time)}`}
          </span>
          {e.next.label ? <span className="slip-name">{e.next.label}</span> : null}
          <span className="slip-meta">{e.title}</span>
        </>
      ) : (
        <>
          <span className="flex items-center gap-2">
            <DateBlock date={e.next.date} />
            <span className="slip-time">
              {noTime ? "Time not listed" : formatTimeRange(e.next.start_time, e.next.end_time)}
              <br />
              {price}
            </span>
          </span>
          <span className="slip-name mt-1">{e.title}</span>
        </>
      )}
      <span className="slip-meta [font-stretch:88%]">
        {classes ? `${where} · ${price}` : where}
      </span>
    </span>
  );
}

function isTall(e: EventCard) {
  return e.flyer_w && e.flyer_h ? e.flyer_h / e.flyer_w > 1.6 : false;
}
export function isWide(e: EventCard) {
  return e.flyer_w && e.flyer_h ? e.flyer_w / e.flyer_h > 1.3 : false;
}

/** A flyer pinned to the wall: the artwork whole, never cropped, with its slip taped on. */
export function FlyerCard({ e, today, priority = false }: { e: EventCard; today: string; priority?: boolean }) {
  const src = flyerUrl(e.flyer, "sm");
  const tilt = tiltFor(e.id);
  return (
    <Link
      href={`/e/${e.slug}`}
      className="group mb-7 block break-inside-avoid focus-visible:outline-offset-4"
      aria-label={`${e.title}, ${e.venue.name}`}
    >
      <span className="tilt relative block transition-transform duration-[var(--pin-in)] group-hover:-translate-y-0.5" style={{ transform: `rotate(${tilt}deg)` }}>
        {src ? (
          isTall(e) ? (
            <span className="flex aspect-[1/1.6] justify-center bg-wall-2 shadow-e2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading={priority ? "eager" : "lazy"} className="h-full w-auto" />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt=""
              width={e.flyer_w ?? undefined}
              height={e.flyer_h ?? undefined}
              loading={priority ? "eager" : "lazy"}
              className="block h-auto w-full bg-wall-2 shadow-e2 outline-1 -outline-offset-1 outline-black/10"
            />
          )
        ) : (
          <span className="flex aspect-[4/5] items-center justify-center border-[1.5px] border-dashed border-line-strong bg-wall-2 p-4 text-center text-lg font-bold">
            {e.title}
          </span>
        )}
        {e.is_demo ? <span className="absolute top-2 right-2 bg-ink px-2 py-0.5 text-[12px] font-bold text-wall uppercase">Sample</span> : null}
      </span>
      <Slip
        e={e}
        today={today}
        className="tilt -mt-3.5 ml-2 mr-[-4px]"
        style={{ transform: `rotate(${-tilt * 0.9}deg)` }}
      />
    </Link>
  );
}

/** The wall: flyers in columns at their real shape. Wide flyers span the whole row. */
export function FlyerGrid({ items, today, cols = "columns-2 sm:columns-3 lg:columns-4" }: { items: EventCard[]; today: string; cols?: string }) {
  return (
    <div className={`${cols} gap-3 lg:gap-6`}>
      {items.map((e, i) => (
        <div key={e.id} className={isWide(e) ? "[column-span:all]" : ""}>
          <div className={isWide(e) ? "mx-auto max-w-xl" : ""}>
            <FlyerCard e={e} today={today} priority={i < 4} />
          </div>
        </div>
      ))}
    </div>
  );
}
