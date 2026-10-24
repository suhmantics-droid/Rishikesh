"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { AgendaItem, EventCard, MapPin } from "@/lib/data";
import { formatDayLong, formatTimeRange } from "@/lib/dates";
import { AREAS, CATEGORIES, PRICE_OPTIONS, SITE, TIME_OPTIONS, WHEN_OPTIONS } from "@/lib/site";
import { Agenda } from "./Agenda";
import { FlyerGrid } from "./FlyerCard";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-paper-2" />,
});

type Props = {
  today: string;
  agenda: AgendaItem[];
  wall: EventCard[];
  pins: MapPin[];
  when: string;
};

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition ${
        active ? "border-ganga bg-ganga text-on-ganga" : "border-line bg-card text-ink-2 hover:border-ganga/60"
      }`}
    >
      {color ? <span className="h-2 w-2 rounded-full" style={{ background: color }} /> : null}
      {children}
    </button>
  );
}

export function Browse({ today, agenda, wall, pins, when }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [view, setView] = useState<"wall" | "list" | "map">((sp.get("view") as "wall" | "list" | "map") || "wall");
  const [showMore, setShowMore] = useState(Boolean(sp.get("area") || sp.get("price") || sp.get("time")));
  const cats = (sp.get("cat") ?? "").split(",").filter(Boolean);

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
    const events = agenda.filter((e) => e.kind !== "classes");
    const classes = new Set(agenda.filter((e) => e.kind === "classes").map((e) => e.id)).size;
    const items = events.slice(0, 15);
    const lines = items.map(
      (e) => `• ${formatTimeRange(e.occ.start_time, e.occ.end_time) || "All day"} ${e.title} @ ${e.venue.name}`,
    );
    const label = WHEN_OPTIONS.find((w) => w.key === when)?.label ?? formatDayLong(when, today);
    // "Today" shares the /today page, whose link preview is a picture of the day's list.
    const link = when === "today" ? `${window.location.origin}/today?d=${today}` : window.location.href;
    const more = [events.length > 15 ? "…and more" : "", classes ? `+ ${classes} drop-in class timetable${classes === 1 ? "" : "s"}` : ""].filter(Boolean);
    const text = `📌 ${label} in Tapovan (${events.length} event${events.length === 1 ? "" : "s"})\n${lines.join("\n")}${more.length ? `\n${more.join("\n")}` : ""}\n\nAll flyers + map: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  const filtersActive = cats.length > 0 || sp.get("area") || sp.get("price") || sp.get("time") || sp.get("q");

  return (
    <div className={pending ? "opacity-70 transition-opacity" : "transition-opacity"}>
      {/* Filter bar */}
      <div className="-mx-4 border-b border-line/70 px-4 pt-2 pb-3">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {WHEN_OPTIONS.map((w) => (
            <Chip key={w.key} active={when === w.key} onClick={() => update({ when: w.key === "week" ? null : w.key })}>
              {w.label}
            </Chip>
          ))}
          <label className="relative inline-flex shrink-0 items-center rounded-full border border-line bg-card px-3 py-1.5 text-[13px] font-semibold text-ink-2">
            <span>{/^\d{4}/.test(when) ? formatDayLong(when, today) : "Pick a date"}</span>
            <input
              type="date"
              min={today}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Pick a date"
              onChange={(e) => e.target.value && update({ when: e.target.value })}
            />
          </label>
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.filter((c) => c.key !== "other").map((c) => (
            <Chip key={c.key} active={cats.includes(c.key)} onClick={() => toggleCat(c.key)} color={c.color}>
              {c.short}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <form
            className="flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q") as string;
              update({ q: q.trim() || null });
            }}
          >
            <input
              name="q"
              defaultValue={sp.get("q") ?? ""}
              placeholder="Search artist, cafe, 'cacao'…"
              className="w-full rounded-full border border-line bg-card px-4 py-2 text-sm outline-none placeholder:text-muted focus:border-ink-2"
            />
          </form>
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="shrink-0 rounded-full border border-line bg-card px-3 py-2 text-[13px] font-semibold text-ink-2"
            aria-expanded={showMore}
          >
            {showMore ? "Fewer filters" : "More filters"}
          </button>
        </div>
        {showMore ? (
          <div className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
            <select
              value={sp.get("area") ?? ""}
              onChange={(e) => update({ area: e.target.value || null })}
              className="rounded-xl border border-line bg-card px-2 py-2"
              aria-label="Area"
            >
              <option value="">All areas</option>
              {AREAS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label}
                </option>
              ))}
            </select>
            <select
              value={sp.get("price") ?? ""}
              onChange={(e) => update({ price: e.target.value || null })}
              className="rounded-xl border border-line bg-card px-2 py-2"
              aria-label="Price"
            >
              <option value="">Any price</option>
              {PRICE_OPTIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
            <select
              value={sp.get("time") ?? ""}
              onChange={(e) => update({ time: e.target.value || null })}
              className="rounded-xl border border-line bg-card px-2 py-2"
              aria-label="Time of day"
            >
              <option value="">Any time</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Results header + view switch */}
      <div className="flex items-center gap-2 py-3">
        <p className="text-sm text-muted">
          <b className="text-ink">{wall.length}</b> flyer{wall.length === 1 ? "" : "s"} · {agenda.length} session{agenda.length === 1 ? "" : "s"}
          {filtersActive ? (
            <>
              {" · "}
              <button type="button" className="font-semibold text-saffron-ink underline" onClick={() => router.replace(`${pathname}?when=${when}`)}>
                clear filters
              </button>
            </>
          ) : null}
        </p>
        <div className="ml-auto flex rounded-full border border-line bg-card p-0.5 text-[13px] font-semibold">
          {(["wall", "list", "map"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => chooseView(v)}
              className={`rounded-full px-3 py-1 ${v === "map" ? "lg:hidden" : ""} ${view === v ? "bg-ganga text-on-ganga" : "text-ink-2"}`}
            >
              {v === "wall" ? "Flyers" : v === "list" ? "Agenda" : "Map"}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-6">
        <div className={view === "map" ? "hidden lg:block" : ""}>
          {wall.length === 0 ? (
            <Empty when={when} />
          ) : view === "list" ? (
            <Agenda items={agenda} today={today} />
          ) : (
            <FlyerGrid items={wall} today={today} />
          )}
          {agenda.length > 0 ? (
            <button
              type="button"
              onClick={shareOnWhatsApp}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm font-bold text-ink-2 hover:border-ink-2"
            >
              <WhatsAppIcon /> Share this list on WhatsApp
            </button>
          ) : null}
        </div>
        <div className={view === "map" ? "" : "hidden lg:block"}>
          <div className="sticky top-[4.5rem] h-[calc(100svh-6rem)] min-h-[360px] overflow-hidden rounded-2xl border border-line shadow-card max-lg:h-[70svh]">
            <MapView pins={pins} today={today} />
          </div>
          {pins.length === 0 ? <p className="mt-2 text-sm text-muted">No venues to show for these filters.</p> : null}
        </div>
      </div>
    </div>
  );
}

function Empty({ when }: { when: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center">
      <p className="font-display text-xl font-semibold">Nothing pinned here yet</p>
      <p className="mt-1 text-sm text-muted">
        {when === "today" ? "Quiet day — or nobody has posted tonight's flyer. " : "Try a wider date range or fewer filters. "}
        Seen a flyer on a cafe wall?
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/?when=all" className="rounded-full border border-line px-4 py-2 text-sm font-semibold">
          All upcoming
        </Link>
        <Link href="/post" className="rounded-full bg-saffron px-4 py-2 text-sm font-semibold text-white">
          Post a flyer
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted">{SITE.tagline}</p>
    </div>
  );
}

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="#25D366">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.2-.1-1-.4-2-1.2-.7-.6-1.2-1.4-1.4-1.7-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.2.3-.9.9-.9 2.2s1 2.6 1.1 2.7c.1.2 1.9 2.9 4.6 4 .6.3 1.1.5 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.3z" />
    </svg>
  );
}
