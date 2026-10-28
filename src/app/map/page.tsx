import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MapView } from "@/components/MiniMap";
import { getWhatsOn, listPlaces } from "@/lib/data";
import { isValidDate } from "@/lib/dates";
import { WHEN_OPTIONS } from "@/lib/site";

export const metadata: Metadata = {
  title: "The flyer map of Tapovan",
  description: "Every flyer in Tapovan and Laxman Jhula pinned to the map where it's happening: live music, ecstatic dance, kirtan, yoga classes and more.",
};

export default function MapPage({ searchParams }: PageProps<"/map">) {
  return (
    <div className="relative h-[calc(100svh-3.5rem-3px)] min-h-[480px]">
      <Suspense fallback={<div className="h-full w-full animate-pulse bg-paper-2" />}>
        <FlyerMap searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FlyerMap({ searchParams }: { searchParams: PageProps<"/map">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.when === "string" ? sp.when : "week";
  const when = ["today", "tomorrow", "weekend", "week", "all"].includes(raw) || isValidDate(raw) ? raw : "week";
  const [{ pins, wall, today }, places] = await Promise.all([getWhatsOn({ when }), listPlaces()]);
  const events = wall.filter((e) => e.kind !== "classes").length;
  const classes = wall.length - events;
  return (
    <>
      <MapView pins={pins} places={places} today={today} insetBottom={150} />
      <div className="pointer-events-none absolute inset-x-3 bottom-6 z-[500] flex justify-center sm:justify-start">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-line bg-card/95 p-3 shadow-card backdrop-blur">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-xl font-semibold tracking-tight">The flyer map</h1>
            <p className="truncate text-sm text-muted">
              {events} event{events === 1 ? "" : "s"}
              {classes ? ` · ${classes} class timetable${classes === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <nav className="no-scrollbar -mx-3 mt-2 flex gap-1.5 overflow-x-auto px-3" aria-label="When">
            {WHEN_OPTIONS.map((w) => (
              <Link
                key={w.key}
                href={w.key === "week" ? "/map" : `/map?when=${w.key}`}
                replace
                scroll={false}
                className={`shrink-0 rounded-full border px-3 py-1 text-[13px] font-semibold ${
                  when === w.key ? "border-ganga bg-ganga text-on-ganga" : "border-line bg-card text-ink-2"
                }`}
              >
                {w.label}
              </Link>
            ))}
          </nav>
          <p className="mt-2 text-xs text-muted">
            Tap a flyer to look closer. <span className="font-bold text-saffron-ink">✦</span> recommended · 🛏 stays · zoom in for ☕ cafes and 🧘 studios
          </p>
        </div>
      </div>
    </>
  );
}
