import Link from "next/link";
import type { AgendaItem } from "@/lib/data";
import { formatTime } from "@/lib/dates";
import { placeNote, priceOrNotListed } from "./FlyerCard";
import { LiveBadge } from "./Live";

/** One session as a row: the time first, big, then what and where. Used for "now and next", tonight, today. */
export function SessionRow({ item, showStarted = false, now }: { item: AgendaItem; showStarted?: boolean; now?: string }) {
  const { occ } = item;
  const started = showStarted && now && occ.start_time && occ.start_time < now;
  const name = occ.label ?? item.title;
  const meta = [occ.label ? item.title : null, item.venue.name, placeNote(item.venue), priceOrNotListed(item)].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/e/${item.slug}`}
      className="grid grid-cols-[76px_1fr] items-start gap-3 bg-surface px-3 py-2.5 shadow-[0_1px_0_rgb(0_0_0/0.06)] hover:bg-slip lg:grid-cols-[96px_1fr]"
    >
      <span className="flex flex-col items-start gap-1">
        <span className={`slip-time ${started ? "text-[14px] text-muted" : "text-[17px]"}`}>
          {started ? `Started ${formatTime(occ.start_time)}` : formatTime(occ.start_time) || "Time n/a"}
        </span>
        <LiveBadge date={occ.date} start={occ.start_time} end={occ.end_time} />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="slip-name">{name}</span>
        <span className="text-[16px] leading-snug text-ink-2">{meta}</span>
      </span>
    </Link>
  );
}
