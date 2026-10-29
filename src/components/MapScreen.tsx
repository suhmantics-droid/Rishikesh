"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { AgendaItem, MapPin, Place } from "@/lib/data";
import { formatDay, formatTime, formatTimeRange, weekday } from "@/lib/dates";
import { directionsLink, flyerUrl } from "@/lib/util";
import { placeNote, priceOrNotListed, WeekStrip } from "./FlyerCard";
import { Icon } from "./Icon";
import { locateMe, useHere } from "./Live";
import type { MapApi } from "./MapView";
import { PlanButton } from "./Plan";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-wall-2" />,
});

export const MAP_WHENS = [
  { key: "now", label: "Now" },
  { key: "tonight", label: "Tonight" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "weekend", label: "Weekend" },
  { key: "week", label: "This week" },
] as const;

const WINDOW_WORD: Record<string, string> = { now: "Now", tonight: "Tonight", tomorrow: "Tomorrow", weekend: "this weekend", week: "this week" };

/** Below this zoom the map shows time labels; at it and above, the flyers themselves. */
const FLYER_ZOOM = 16;

/** One row per flyer, at its first session in the list. */
function perFlyer(items: AgendaItem[]) {
  const seen = new Map<number, AgendaItem>();
  for (const i of items) if (!seen.has(i.id)) seen.set(i.id, i);
  return [...seen.values()];
}

function when(o: AgendaItem, today: string) {
  const t = formatTimeRange(o.occ.start_time, o.occ.end_time) || "time not listed";
  return o.occ.date === today ? t : `${formatDay(o.occ.date, today)} ${t}`;
}

/** "Today 4pm–5:30pm", "Next fri 7am", "Tomorrow 7pm": the line people read first. */
function nextLine(o: AgendaItem, today: string) {
  const day = formatDay(o.occ.date, today);
  const t = formatTime(o.occ.start_time);
  // Today's session may already be under way, so give its hours rather than calling it "next".
  if (o.kind === "classes" && o.occ.date === today) return `Today ${formatTimeRange(o.occ.start_time, o.occ.end_time)}`.trim();
  if (o.kind === "classes") return `Next ${day.toLowerCase()} ${t}`.trim();
  return `${day} ${t}`.trim();
}

type Props = {
  when: string;
  today: string;
  agenda: AgendaItem[];
  pins: MapPin[];
  faded: MapPin[];
  fadedAgenda: AgendaItem[];
  places: Place[];
};

export function MapScreen({ when: win, today, agenda, pins, faded, fadedAgenda, places }: Props) {
  const api = useRef<MapApi | null>(null);
  const here = useHere();
  const [selected, setSelected] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [locating, setLocating] = useState<string | null>(null);

  const flyers = useMemo(() => perFlyer(agenda), [agenda]);
  const offMap = flyers.filter((o) => o.venue.lat == null);
  const onMap = flyers.filter((o) => o.venue.lat != null);
  const sel = useMemo(() => {
    if (!selected) return null;
    const items = perFlyer([...agenda, ...fadedAgenda].filter((o) => o.venue.slug === selected));
    return items.length ? { items, outside: !agenda.some((o) => o.venue.slug === selected) } : null;
  }, [selected, agenda, fadedAgenda]);

  function choose(slug: string) {
    setSelected(slug);
    api.current?.focus(slug);
  }

  async function nearMe() {
    setLocating("Finding you…");
    const err = await locateMe();
    setLocating(err);
    if (!err) setTimeout(() => setLocating(null), 1500);
  }

  const word = WINDOW_WORD[win] ?? "this week";
  const summary = `${pins.length} place${pins.length === 1 ? "" : "s"}${offMap.length ? ` · ${offMap.length} on request` : ""}`;

  return (
    <div className="relative h-[calc(100svh-4rem-76px-env(safe-area-inset-bottom))] min-h-[520px] lg:grid lg:h-[calc(100svh-5rem)] lg:grid-cols-[440px_minmax(0,1fr)]">
      {/* Desktop: the list beside the map. */}
      <aside className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-r border-line px-6 py-5 lg:flex">
        <WhenChips win={win} />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[17px] font-bold">
            {onMap.length + offMap.length} flyer{onMap.length + offMap.length === 1 ? "" : "s"} {win === "now" ? "on now or soon" : word.toLowerCase()}
          </h1>
          <ViewSwitch win={win} />
        </div>
        {win === "now" ? <p className="text-[15px] text-muted">Now means on now, or starting in the next 2 hours.</p> : null}
        <ul className="flex flex-col gap-2">
          {onMap.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => choose(o.venue.slug)}
                aria-current={selected === o.venue.slug ? "true" : undefined}
                className={`grid w-full grid-cols-[56px_1fr] gap-3 bg-surface p-2.5 text-left shadow-e1 ${selected === o.venue.slug ? "outline-[3px] outline-ink" : "hover:bg-slip"}`}
              >
                <Thumb o={o} w={56} />
                <RowText o={o} today={today} />
              </button>
            </li>
          ))}
          {offMap.map((o) => (
            <li key={o.id}>
              <OffMapRow o={o} today={today} wide />
            </li>
          ))}
        </ul>
        {flyers.length === 0 ? <Quiet win={win} faded={faded.length} /> : null}
      </aside>

      <div className="relative h-full min-h-0">
        <MapView
          pins={pins}
          faded={faded}
          places={places}
          today={today}
          here={here}
          labelsBelow={FLYER_ZOOM}
          onSelect={choose}
          selected={selected}
          apiRef={api}
          onZoom={(_, l) => setLabels(l)}
          insetTop={130}
          insetBottom={sel ? 260 : 140}
        />

        {/* Phone: When chips, List or Map, and what the count means. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col gap-2 px-4 pt-3 lg:hidden">
          <div className="pointer-events-auto">
            <WhenChips win={win} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="pointer-events-auto">
              <ViewSwitch win={win} />
            </span>
            <span className="bg-wall px-2 py-1 text-[15px] font-bold">{summary}</span>
          </div>
          {win === "now" ? (
            <span className="self-start bg-wall px-2 py-1 text-[14px] font-semibold">
              Now: on now, or starting in the next 2 hours.{faded.length ? " Hollow dots: on later." : ""}
            </span>
          ) : null}
        </div>

        {/* Zoom and near me. */}
        <div className="absolute top-[150px] right-4 z-[500] flex flex-col gap-2.5 lg:top-6 lg:right-6">
          <RoundButton label="Zoom in" icon="plus" onClick={() => api.current?.zoomIn()} />
          <RoundButton label="Zoom out" icon="minus" onClick={() => api.current?.zoomOut()} />
          <RoundButton label="Near me: show where you are" icon="locate" onClick={nearMe} />
        </div>
        {locating ? (
          <p role="status" className="absolute top-[150px] right-20 z-[500] max-w-60 bg-surface px-3 py-2 text-[15px] shadow-e1 lg:top-6 lg:right-24">
            {locating}
          </p>
        ) : null}

        {/* Bottom: the selected place, or the hints. */}
        <div className="absolute inset-x-0 bottom-0 z-[600] flex flex-col gap-2 px-3 pb-3 lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[400px] lg:px-0 lg:pb-0">
          {sel ? (
            <Sheet items={sel.items} outside={sel.outside} word={word} today={today} close={() => setSelected(null)} />
          ) : (
            <>
              {labels && pins.length ? (
                <button
                  type="button"
                  onClick={() => api.current?.zoomTo(FLYER_ZOOM)}
                  className="flex min-h-12 items-center justify-between bg-ink px-4 text-[16px] font-bold text-wall"
                >
                  Zoom in to see the flyers <Icon name="next" size={18} />
                </button>
              ) : null}
              {flyers.length === 0 ? (
                <div className="lg:hidden">
                  <Quiet win={win} faded={faded.length} />
                </div>
              ) : null}
              <div className="flex flex-col gap-2 lg:hidden">
                {offMap.slice(0, 2).map((o) => (
                  <OffMapRow key={o.id} o={o} today={today} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function WhenChips({ win }: { win: string }) {
  return (
    <nav aria-label="When" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
      {MAP_WHENS.map((w) => (
        <Link
          key={w.key}
          href={w.key === "now" ? "/map" : `/map?when=${w.key}`}
          replace
          scroll={false}
          aria-current={win === w.key ? "page" : undefined}
          className={`flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-ink px-4 text-[16px] font-semibold whitespace-nowrap ${
            win === w.key ? "bg-ink text-wall" : "bg-wall hover:bg-wall-2"
          }`}
        >
          {w.label}
        </Link>
      ))}
    </nav>
  );
}

function ViewSwitch({ win }: { win: string }) {
  const list = win === "now" ? "/" : `/flyers?when=${win}`;
  return (
    <span role="group" aria-label="View" className="flex overflow-hidden rounded-full border-[1.5px] border-ink bg-wall">
      <Link href={list} className="flex min-h-11 items-center px-4 text-[16px] font-semibold">
        List
      </Link>
      <span aria-current="page" className="flex min-h-11 items-center bg-ink px-4 text-[16px] font-semibold text-wall">
        Map
      </span>
    </span>
  );
}

function RoundButton({ label, icon, onClick }: { label: string; icon: "plus" | "minus" | "locate"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-surface text-ink shadow-e1"
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

function Thumb({ o, w }: { o: AgendaItem; w: number }) {
  const src = flyerUrl(o.flyer, "sm");
  if (!src) return <span className="block bg-wall-2" style={{ width: w, height: Math.round(w * 1.3) }} aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={w} className="block h-auto shadow-e1" style={{ width: w }} loading="lazy" />;
}

function RowText({ o, today }: { o: AgendaItem; today: string }) {
  const meta = [o.venue.name, placeNote(o.venue), priceOrNotListed(o)].filter(Boolean).join(" · ");
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="slip-time text-[16px]">{when(o, today)}</span>
      <span className="slip-name">{o.occ.label ?? o.title}</span>
      <span className="text-[15px] leading-snug text-ink-2">{meta}</span>
    </span>
  );
}

/** A flyer whose spot isn't on the map: said plainly, with the way to ask. */
function OffMapRow({ o, today, wide = false }: { o: AgendaItem; today: string; wide?: boolean }) {
  return (
    <div className={`grid items-center gap-3 border-[1.5px] border-dashed border-line-strong bg-surface p-2.5 ${wide ? "grid-cols-[56px_1fr]" : "grid-cols-[40px_1fr_auto]"}`}>
      <Thumb o={o} w={wide ? 56 : 40} />
      <span className="flex min-w-0 flex-col">
        <span className="text-[13px] font-extrabold tracking-[0.06em] text-muted uppercase">Not on the map · spot on request</span>
        <span className="truncate text-[16px] font-bold">
          {o.title} · {when(o, today)}
        </span>
        {wide ? (
          <Link href={`/e/${o.slug}`} className="text-[16px] font-bold text-act-ink underline">
            Ask the organiser
          </Link>
        ) : null}
      </span>
      {wide ? null : (
        <Link href={`/e/${o.slug}`} className="flex min-h-11 items-center px-1 text-[16px] font-bold text-act-ink">
          Ask
        </Link>
      )}
    </div>
  );
}

function Quiet({ win, faded }: { win: string; faded: number }) {
  return (
    <p className="border-[1.5px] border-dashed border-line-strong bg-surface px-4 py-3 text-[16px] leading-snug text-ink-2">
      {win === "now" ? "Nothing on in the next two hours." : `Nothing pinned for ${WINDOW_WORD[win] ?? "then"} yet.`}{" "}
      {faded ? "The hollow dots have flyers later this week." : null}{" "}
      <Link href="/map?when=week" className="font-bold underline">
        See this week
      </Link>
    </p>
  );
}

/** The selected place: its first flyer large, any others below, and what to do next. */
function Sheet({ items, outside, word, today, close }: { items: AgendaItem[]; outside: boolean; word: string; today: string; close: () => void }) {
  const [first, ...rest] = items;
  const v = first.venue;
  const meta = [first.occ.label && first.occ.label !== first.title ? first.title : null, priceOrNotListed(first)].filter(Boolean).join(" · ");
  return (
    <section aria-label={`At ${v.name}`} className="-mx-3 flex max-h-[62svh] flex-col gap-3 overflow-y-auto bg-surface px-4 pt-2 pb-4 shadow-e3 lg:mx-0 lg:max-h-[70vh] lg:pt-4">
      <div className="flex items-center justify-between lg:hidden">
        <span className="mx-auto h-[5px] w-10 rounded-full bg-line-strong" aria-hidden />
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] font-extrabold tracking-[0.06em] text-muted uppercase">
          {v.name}
          {placeNote(v) ? ` · ${placeNote(v)}` : ""}
          {outside ? ` · not ${word.toLowerCase()}` : ""}
        </span>
        <button type="button" onClick={close} aria-label="Close" className="-mt-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center">
          <Icon name="close" />
        </button>
      </div>
      <Link href={`/e/${first.slug}`} className="-mt-2 flex items-start gap-3">
        <Thumb o={first} w={96} />
        <span className="flex min-w-0 flex-col gap-1">
          {first.kind === "classes" ? <WeekStrip days={first.days} todayWd={weekday(today)} /> : null}
          <span className="slip-time text-[17px] uppercase">{nextLine(first, today)}</span>
          <span className="text-[18px] leading-tight font-bold">{first.occ.label ?? first.title}</span>
          <span className="text-[15px] leading-snug text-ink-2">{meta}</span>
        </span>
      </Link>
      {rest.length ? (
        <ul className="flex flex-col border-t border-line">
          {rest.map((o) => (
            <li key={o.id} className="border-b border-line">
              <Link href={`/e/${o.slug}`} className="flex min-h-12 flex-col justify-center py-1.5">
                <span className="slip-time text-[15px]">{nextLine(o, today)}</span>
                <span className="text-[16px] font-bold">{o.occ.label ?? o.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
        <a
          href={directionsLink({ ...v })}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-1.5 bg-act px-3 text-[16px] font-bold text-on-act"
        >
          <Icon name="directions" size={18} /> Directions
        </a>
        <Link href={`/e/${first.slug}`} className="flex min-h-12 items-center justify-center border-[1.5px] border-ink px-3 text-[16px] font-bold">
          {first.kind === "classes" ? "Timetable" : "Flyer"}
        </Link>
        <PlanButton slug={first.slug} eventId={first.id} initial={0} compact />
      </div>
    </section>
  );
}
