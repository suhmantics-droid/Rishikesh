import type { Metadata } from "next";
import { Suspense } from "react";
import { MapScreen } from "@/components/MapScreen";
import { type AgendaItem, getWhatsOn, listPlaces, pinsFrom } from "@/lib/data";
import { nowTimeIST } from "@/lib/dates";
import { nowOrSoon } from "@/lib/now";

export const metadata: Metadata = {
  title: "The flyer map of Tapovan",
  description: "Every flyer in Tapovan and Laxman Jhula pinned to the map where it's happening: what's on now, tonight and this week.",
};

const WHENS = ["now", "tonight", "tomorrow", "weekend", "week"];

export default function MapPage({ searchParams }: PageProps<"/map">) {
  return (
    <Suspense fallback={<div className="h-[calc(100svh-4rem-76px)] w-full animate-pulse bg-wall-2 lg:h-[calc(100svh-5rem)]" />}>
      <FlyerMap searchParams={searchParams} />
    </Suspense>
  );
}

async function FlyerMap({ searchParams }: { searchParams: PageProps<"/map">["searchParams"] }) {
  const sp = await searchParams;
  const raw = typeof sp.when === "string" ? sp.when : "now";
  const when = WHENS.includes(raw) ? raw : "now";
  const [win, week, places] = await Promise.all([
    getWhatsOn({ when: when === "now" ? "today" : when }),
    getWhatsOn({ when: "week" }),
    listPlaces(),
  ]);
  const now = nowTimeIST();
  const agenda: AgendaItem[] = when === "now" ? win.agenda.filter((o) => nowOrSoon(o, now)) : win.agenda;
  const pins = pinsFrom(agenda);
  const taken = new Set(pins.map((p) => p.slug));
  // Places with flyers later in the week, so a quiet hour doesn't look like an empty town.
  const fadedAgenda = week.agenda.filter((o) => o.venue.lat != null && !taken.has(o.venue.slug));
  const faded = pinsFrom(fadedAgenda);
  return <MapScreen when={when} today={win.today} agenda={agenda} pins={pins} faded={faded} fadedAgenda={fadedAgenda} places={places} />;
}
