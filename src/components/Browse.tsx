"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { AgendaItem, EventCard, MapPin } from "@/lib/data";
import { formatDayLong, formatTimeRange } from "@/lib/dates";
import { AREAS, CATEGORIES, PRICE_OPTIONS, SITE, TIME_OPTIONS, WHEN_OPTIONS } from "@/lib/site";
import { Agenda } from "./Agenda";
import { FlyerGrid } from "./FlyerCard";
import { Icon } from "./Icon";
import { forgetHere, locateMe, metres, useHere } from "./Live";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-wall-2" />,
});

type Props = {
  today: string;
  agenda: AgendaItem[];
  wall: EventCard[];
  pins: MapPin[];
  when: string;
};

const TYPE_OPTIONS = [
  { key: "event", label: "One-off events" },
  { key: "classes", label: "Classes and timetables" },
] as const;

function Chip({ active, onClick, children, color, tone = "ink" }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string; tone?: "ink" | "sandal" }) {
  const on = tone === "sandal" ? "border-sandal bg-sandal text-wall" : "border-ink bg-ink text-wall";
  const off = tone === "sandal" ? "border-sandal text-sandal font-bold" : "border-line-strong bg-surface text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 text-[16px] font-semibold whitespace-nowrap ${active ? on : off}`}
    >
      {color ? <span className="h-2.5 w-2.5 rounded-full ring-1 ring-current" style={{ background: color }} /> : null}
      {children}
    </button>
  );
}

/** All flyers: the whole collage, with search and filters. Every choice lives in the URL, so back restores it. */
export function Browse({ today, agenda, wall, pins, when }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"wall" | "list" | "map">((sp.get("view") as "wall" | "list" | "map") || "wall");
  const [sheet, setSheet] = useState(false);
  const cats = (sp.get("cat") ?? "").split(",").filter(Boolean);
  const here = useHere();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const shown = here ? [...wall].sort((a, b) => dist(a) - dist(b)) : wall;
  function dist(e: EventCard) {
    return here && e.venue.lat != null && e.venue.lng != null ? metres(here, { lat: e.venue.lat, lng: e.venue.lng }) : Infinity;
  }
  async function nearMe() {
    if (here) return forgetHere();
    setLocating(true);
    setLocError(await locateMe());
    setLocating(false);
  }

  useEffect(() => {
    if (!sheet) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [sheet]);

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }
  function toggleCat(key: string) {
    const set = new Set(cats);
    if (set.has(key)) set.delete(key);
    else set.add(key);
    update({ cat: [...set].join(",") || null });
  }
  function chooseView(v: "wall" | "list" | "map") {
    setView(v);
    const next = new URLSearchParams(sp.toString());
    if (v === "wall") next.delete("view");
    else next.set("view", v);
    window.history.replaceState(null, "", `${pathname}?${next.toString()}`);
  }
  function shareOnWhatsApp() {
    const lines = wall.slice(0, 15).map((e) => `• ${e.kind === "classes" ? "Classes" : formatTimeRange(e.next.start_time, e.next.end_time) || "All day"} ${e.title} @ ${e.venue.name}`);
    const label = WHEN_OPTIONS.find((w) => w.key === when)?.label ?? formatDayLong(when, today);
    const text = `${label} in Tapovan (${wall.length} flyer${wall.length === 1 ? "" : "s"})\n${lines.join("\n")}${wall.length > 15 ? "\n…and more" : ""}\n\nEvery flyer: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const whenLabel = /^\d{4}/.test(when) ? formatDayLong(when, today) : (WHEN_OPTIONS.find((w) => w.key === when)?.label ?? "Next 7 days");
  const active: { key: string; label: string; clear: () => void }[] = [
    ...cats.map((c) => ({
      key: `cat-${c}`,
      label: c === "practice" ? "Practice" : (CATEGORIES.find((x) => x.key === c)?.short ?? c),
      clear: () => toggleCat(c),
    })),
    ...(sp.get("type") ? [{ key: "type", label: TYPE_OPTIONS.find((t) => t.key === sp.get("type"))?.label ?? "", clear: () => update({ type: null }) }] : []),
    ...(sp.get("price") ? [{ key: "price", label: PRICE_OPTIONS.find((p) => p.key === sp.get("price"))?.label ?? "", clear: () => update({ price: null }) }] : []),
    ...(sp.get("area") ? [{ key: "area", label: AREAS.find((a) => a.key === sp.get("area"))?.label ?? "", clear: () => update({ area: null }) }] : []),
    ...(sp.get("time") ? [{ key: "time", label: TIME_OPTIONS.find((t) => t.key === sp.get("time"))?.label ?? "", clear: () => update({ time: null }) }] : []),
    ...(sp.get("q") ? [{ key: "q", label: `“${sp.get("q")}”`, clear: () => update({ q: null }) }] : []),
  ];

  const panel = (
    <div className="flex flex-col">
      <Group title="When">
        {WHEN_OPTIONS.map((w) => (
          <Chip key={w.key} active={when === w.key} onClick={() => update({ when: w.key === "week" ? null : w.key })}>
            {w.label}
          </Chip>
        ))}
        <label className="relative inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-line-strong bg-surface px-4 text-[16px] font-semibold">
          <span>{/^\d{4}/.test(when) ? formatDayLong(when, today) : "Pick a date"}</span>
          <input type="date" min={today} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Pick a date" onChange={(e) => e.target.value && update({ when: e.target.value })} />
        </label>
      </Group>
      <Group title="Type">
        {TYPE_OPTIONS.map((t) => (
          <Chip key={t.key} active={sp.get("type") === t.key} onClick={() => update({ type: sp.get("type") === t.key ? null : t.key })}>
            {t.label}
          </Chip>
        ))}
      </Group>
      <Group title="Price">
        {PRICE_OPTIONS.map((p) => (
          <Chip key={p.key} active={sp.get("price") === p.key} onClick={() => update({ price: sp.get("price") === p.key ? null : p.key })}>
            {p.label}
          </Chip>
        ))}
      </Group>
      <Group title="Kind of thing">
        <Chip tone="sandal" active={cats.includes("practice")} onClick={() => toggleCat("practice")}>
          Practice
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.key} active={cats.includes(c.key)} onClick={() => toggleCat(c.key)} color={c.color}>
            {c.short}
          </Chip>
        ))}
      </Group>
      <Group title="Area">
        {AREAS.map((a) => (
          <Chip key={a.key} active={sp.get("area") === a.key} onClick={() => update({ area: sp.get("area") === a.key ? null : a.key })}>
            {a.label}
          </Chip>
        ))}
      </Group>
      <Group title="Time of day">
        {TIME_OPTIONS.map((t) => (
          <Chip key={t.key} active={sp.get("time") === t.key} onClick={() => update({ time: sp.get("time") === t.key ? null : t.key })}>
            {t.label}
          </Chip>
        ))}
      </Group>
    </div>
  );

  return (
    <div className={`lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12 ${pending ? "opacity-70 transition-opacity" : "transition-opacity"}`}>
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="flex items-baseline justify-between pb-2">
          <h2 className="text-[22px] font-extrabold">Filters</h2>
          {active.length ? (
            <button type="button" className="min-h-11 text-[16px] font-bold text-act-ink underline" onClick={() => router.replace(pathname)}>
              Clear all
            </button>
          ) : null}
        </div>
        {panel}
      </aside>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3">
          <h1 className="text-[30px] leading-none font-extrabold [font-stretch:85%] lg:text-[36px]">All flyers</h1>
          <span className="text-[16px] font-semibold text-muted">
            {wall.length} flyer{wall.length === 1 ? "" : "s"} · {whenLabel.toLowerCase()} · soonest first
          </span>
        </div>
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q") as string;
            update({ q: q.trim() || null });
          }}
        >
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2" />
          <input
            id="search"
            name="q"
            type="search"
            defaultValue={sp.get("q") ?? ""}
            aria-label="Search flyers"
            placeholder="Artist, cafe, “cacao”…"
            className="min-h-12 w-full border-[1.5px] border-line-strong bg-surface pr-3 pl-11 text-[17px] outline-none placeholder:text-muted"
          />
        </form>
        <div className="no-scrollbar -mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-ink bg-ink px-4 text-[16px] font-bold text-wall"
          >
            <Icon name="filter" size={18} /> Filters{active.length ? ` · ${active.length}` : ""}
          </button>
          <Chip active={false} onClick={() => setSheet(true)}>
            {whenLabel}
            <Icon name="down" size={16} />
          </Chip>
          <Chip tone="sandal" active={cats.includes("practice")} onClick={() => toggleCat("practice")}>
            Practice
          </Chip>
          <Chip active={!!here} onClick={nearMe}>
            <Icon name="locate" size={18} />
            {locating ? "Finding you…" : here ? "Nearest first" : "Near me"}
          </Chip>
        </div>
        {active.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {active.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.clear}
                aria-label={`Remove filter ${a.label}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-full bg-act-soft px-3 text-[16px] font-bold text-act-soft-ink"
              >
                {a.label}
                <Icon name="close" size={18} />
              </button>
            ))}
            <button type="button" className="min-h-11 px-1 text-[16px] font-bold underline" onClick={() => router.replace(pathname)}>
              Clear all
            </button>
          </div>
        ) : null}
        {locError ? (
          <p className="mt-3 border-[1.5px] border-line-strong bg-surface px-3 py-2 text-[16px]">
            {locError} Showing flyers by time instead. Walking times need your location.
          </p>
        ) : null}

        <div className="mt-4 mb-4 flex items-center justify-end">
          <div role="group" aria-label="View" className="flex overflow-hidden rounded-full border-[1.5px] border-ink">
            {(["wall", "list", "map"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => chooseView(v)}
                className={`min-h-11 px-4 text-[16px] font-semibold ${view === v ? "bg-ink text-wall" : ""}`}
              >
                {v === "wall" ? "Wall" : v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
        </div>

        {wall.length === 0 ? (
          <Empty when={when} clear={() => router.replace(pathname)} filtered={active.length > 0} />
        ) : view === "map" ? (
          <div className="h-[70svh] min-h-[420px] overflow-hidden border border-line">
            <MapView pins={pins} today={today} here={here} />
          </div>
        ) : view === "list" ? (
          <Agenda items={agenda} today={today} />
        ) : (
          <FlyerGrid items={shown} today={today} cols="columns-2 sm:columns-3 xl:columns-4" />
        )}
        {wall.length > 0 ? (
          <button
            type="button"
            onClick={shareOnWhatsApp}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 border-[1.5px] border-line-strong bg-surface text-[16px] font-bold"
          >
            <Icon name="message" /> Share this list on WhatsApp
          </button>
        ) : null}
      </div>

      {sheet ? (
        <div className="fixed inset-0 z-[1100] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-ink/60" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 top-16 bottom-0 flex flex-col rounded-t-[22px] bg-surface shadow-e3">
            <div className="flex items-center justify-between py-2 pr-2 pl-5">
              <h2 className="text-[24px] font-extrabold [font-stretch:85%]">Filters</h2>
              <button type="button" aria-label="Close filters" onClick={() => setSheet(false)} className="flex h-11 w-11 items-center justify-center">
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-3">{panel}</div>
            <div className="grid grid-cols-[1fr_1.6fr] gap-2.5 border-t border-line px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => router.replace(pathname)} className="min-h-[52px] rounded-full border-[1.5px] border-ink text-[17px] font-bold">
                Clear all
              </button>
              <button type="button" onClick={() => setSheet(false)} className="min-h-[52px] rounded-full bg-ink text-[17px] font-bold text-wall">
                {pending ? "Updating…" : wall.length === 0 ? "Nothing matches" : `Show ${wall.length} flyer${wall.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-line py-4 first:border-t-0">
      <p className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Empty({ when, clear, filtered }: { when: string; clear: () => void; filtered: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3 border-[1.5px] border-dashed border-line-strong px-5 py-6">
      <p className="text-[21px] font-extrabold">{filtered ? "Nothing matches these filters" : "Nothing pinned here yet"}</p>
      <p className="text-[16px] text-ink-2">
        {when === "tonight" ? "No flyers for tonight yet. The Ganga Aarti is on, as every evening. " : "Try a wider date range or fewer filters. "}
        Seen a flyer on a cafe wall?
      </p>
      <div className="flex flex-wrap gap-2">
        {filtered ? (
          <button type="button" onClick={clear} className="min-h-11 rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold">
            Clear filters
          </button>
        ) : (
          <Link href="/flyers?when=all" className="flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold">
            All upcoming
          </Link>
        )}
        <Link href="/post" className="flex min-h-11 items-center rounded-full bg-ink px-4 text-[16px] font-bold text-wall">
          Post a flyer
        </Link>
      </div>
      <p className="text-[14px] text-muted">{SITE.tagline}</p>
    </div>
  );
}

/** WhatsApp buttons use the chat shape with the app's name written beside it, not the brand logo. */
export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return <Icon name="message" size={18} className={className} />;
}
