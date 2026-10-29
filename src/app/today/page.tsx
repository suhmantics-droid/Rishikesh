import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { GangaDaily } from "@/components/GangaDaily";
import { Icon } from "@/components/Icon";
import { SessionRow } from "@/components/SessionRow";
import { StoryShare } from "@/components/StoryShare";
import { type AgendaItem, getWhatsOn } from "@/lib/data";
import { formatDate, nowTimeIST, todayIST } from "@/lib/dates";
import { DAY_BANDS } from "@/lib/site";

// A single shareable "what's on today" page, made to be pasted into WhatsApp groups.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const today = todayIST();
  return {
    title: `Today in Tapovan · ${formatDate(today)}`,
    description: "Everything on today in Tapovan and Laxman Jhula: live music, dance, sound healing, kirtan, yoga and more.",
    openGraph: { images: [{ url: `/today/og?d=${today}`, width: 1200, height: 630 }] },
  };
}

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-8 lg:pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse bg-wall-2" />}>
        <Today />
      </Suspense>
    </div>
  );
}

async function Today() {
  const { agenda, today } = await getWhatsOn({ when: "today" });
  const now = nowTimeIST();
  const events = new Set(agenda.filter((e) => e.kind !== "classes").map((e) => e.id)).size;
  const classes = agenda.filter((e) => e.kind === "classes").length;
  // Each session goes in the first band whose end is at or after its start.
  const bandOf = (t: string) => DAY_BANDS.find((b) => t <= b.to)?.key ?? "night";
  const bands = DAY_BANDS.map((b) => ({ ...b, items: agenda.filter((o: AgendaItem) => o.occ.start_time && bandOf(o.occ.start_time) === b.key) }));
  const untimed = agenda.filter((o) => !o.occ.start_time);

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">{formatDate(today)}</span>
        <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">
          <span lang="hi" className="hi">
            आज
          </span>
          Today in Tapovan
        </h1>
        <p className="text-[17px] text-ink-2">
          {agenda.length
            ? [events ? `${events} event${events === 1 ? "" : "s"}` : "", classes ? `${classes} drop-in class${classes === 1 ? "" : "es"}` : ""].filter(Boolean).join(" and ") + " today."
            : "Nothing pinned for today yet."}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {agenda.length ? <StoryShare /> : null}
          <Link href="/map" className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold">
            <Icon name="map" size={18} /> See them on the map
          </Link>
        </div>
      </div>

      {bands.map((b) =>
        b.items.length || b.key === "evening" ? (
          <section key={b.key} aria-labelledby={`h-${b.key}`} className="flex flex-col gap-2">
            <h2 id={`h-${b.key}`} className="text-[21px] leading-tight font-extrabold">
              <span lang="hi" className="hi">
                {b.hi}
              </span>
              {b.label}
            </h2>
            {b.items.map((o) => (
              <SessionRow key={`${o.id}${o.occ.start_time}${o.occ.label ?? ""}`} item={o} showStarted now={now} />
            ))}
            {b.key === "evening" ? (
              <Suspense fallback={null}>
                <GangaDaily compact />
              </Suspense>
            ) : null}
          </section>
        ) : null,
      )}
      {untimed.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-[21px] font-extrabold">Time not listed</h2>
          {untimed.map((o) => (
            <SessionRow key={`${o.id}-untimed`} item={o} />
          ))}
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link href="/flyers?when=tomorrow" className="inline-flex min-h-12 items-center gap-1 rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold">
          Tomorrow <Icon name="next" size={18} />
        </Link>
        <Link href="/flyers?when=weekend" className="inline-flex min-h-12 items-center gap-1 rounded-full border-[1.5px] border-ink px-4 text-[16px] font-bold">
          This weekend <Icon name="next" size={18} />
        </Link>
        <Link href="/alerts" className="inline-flex min-h-12 items-center rounded-full bg-ink px-4 text-[16px] font-bold text-wall">
          Get a morning list
        </Link>
      </div>
    </div>
  );
}
