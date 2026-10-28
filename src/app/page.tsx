import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FlyerCard, FlyerGrid } from "@/components/FlyerCard";
import { GangaDaily } from "@/components/GangaDaily";
import { Icon } from "@/components/Icon";
import { SessionRow } from "@/components/SessionRow";
import { WhenBar } from "@/components/WhenBar";
import { type AgendaItem, type EventCard, getWhatsOn } from "@/lib/data";
import { addDays, formatDate, formatTime, nowTimeIST } from "@/lib/dates";
import { TONIGHT_FROM } from "@/lib/site";

// The home wall is "now first": what's on now and in the next couple of hours, then tonight,
// this week's one-off events, and tomorrow morning's practice. Everything else lives on /flyers.

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="paper-grain">
      <Suspense fallback={null}>
        <LegacyLinks searchParams={searchParams} />
      </Suspense>
      <div className="mx-auto max-w-7xl px-4 lg:px-12">
        <WhenBar active="now" />
        <Suspense fallback={<WallSkeleton />}>
          <HomeWall />
        </Suspense>
      </div>
    </div>
  );
}

/** Old shared links (/?when=tomorrow, /?view=map…) now live on the All flyers page. */
async function LegacyLinks({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const keep = new URLSearchParams();
  for (const k of ["when", "cat", "area", "price", "time", "q", "view"]) if (typeof sp[k] === "string") keep.set(k, sp[k] as string);
  if ([...keep.keys()].length) redirect(`/flyers?${keep.toString()}`);
  return null;
}

const SOON_MINUTES = 120;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** On now, or starting within the next two hours. */
function nowOrSoon(o: AgendaItem, now: string) {
  if (!o.occ.start_time) return false;
  return toMin(o.occ.start_time) <= toMin(now) + SOON_MINUTES;
}
function isTonight(o: AgendaItem) {
  const s = o.occ.start_time;
  if (!s) return false;
  return s >= TONIGHT_FROM || (!!o.occ.end_time && o.occ.end_time > TONIGHT_FROM);
}
/** One card per flyer, at its first session in the list. */
function perFlyer(items: AgendaItem[]): EventCard[] {
  const seen = new Map<number, EventCard>();
  for (const i of items) if (!seen.has(i.id)) seen.set(i.id, { ...i, next: i.occ });
  return [...seen.values()];
}

async function HomeWall() {
  const [day, week, tom] = await Promise.all([getWhatsOn({ when: "today" }), getWhatsOn({ when: "week" }), getWhatsOn({ when: "tomorrow" })]);
  const today = day.today;
  const now = nowTimeIST();

  const soon = day.agenda.filter((o) => nowOrSoon(o, now));
  const soonFlyers = perFlyer(soon);
  const shownNow = soonFlyers.slice(0, 6);
  const soonKeys = new Set(soon.map((o) => `${o.id}|${o.occ.start_time}`));
  const tonight = day.agenda.filter((o) => isTonight(o) && !soonKeys.has(`${o.id}|${o.occ.start_time}`));
  const laterAfternoon = day.agenda.filter((o) => !isTonight(o) && !soonKeys.has(`${o.id}|${o.occ.start_time}`) && o.occ.start_time);
  const oneOffs = week.wall.filter((e) => e.kind !== "classes");
  const morning = tom.agenda.filter((o) => o.occ.start_time && o.occ.start_time < "12:00").slice(0, 6);
  const nothingToday = day.agenda.length === 0;

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
      <div className="flex flex-col gap-9">
        <section aria-labelledby="h-now" className="flex flex-col gap-3">
          <Heading id="h-now" hi="अभी" title="On the wall now" aside={`${formatDate(today)} · ${formatTime(now)}`} />
          {shownNow.length ? (
            <>
              <FlyerGrid items={shownNow} today={today} cols="columns-2 sm:columns-3 lg:columns-3" />
              {soonFlyers.length > shownNow.length ? (
                <Link href="/flyers?when=today" className="flex min-h-[52px] items-center justify-center rounded-full bg-ink text-[17px] font-bold text-wall">
                  See all {soonFlyers.length} on now and soon
                </Link>
              ) : null}
            </>
          ) : (
            <Quiet>
              {nothingToday ? "Nothing pinned for the rest of today yet." : "Nothing starts in the next two hours."}{" "}
              {oneOffs[0] ? (
                <>
                  Next one-off event:{" "}
                  <Link href={`/e/${oneOffs[0].slug}`} className="font-bold underline">
                    {oneOffs[0].title}
                  </Link>
                  .
                </>
              ) : null}
            </Quiet>
          )}
          {laterAfternoon.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">Later this afternoon</p>
              {laterAfternoon.slice(0, 4).map((o) => (
                <SessionRow key={`${o.id}${o.occ.start_time}`} item={o} />
              ))}
            </div>
          ) : null}
        </section>

        <section aria-labelledby="h-tonight" className="flex flex-col gap-2.5 lg:hidden">
          <Tonight tonight={tonight} now={now} />
        </section>

        <section aria-labelledby="h-oneoff" className="flex flex-col gap-3">
          <Heading id="h-oneoff" hi="इस हफ़्ते" title="This week's one-offs" aside={oneOffs.length ? `${oneOffs.length} event${oneOffs.length === 1 ? "" : "s"}` : undefined} />
          {oneOffs.length ? (
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-2">
              {oneOffs.slice(0, 4).map((e) => (
                <div key={e.id} className="max-w-sm">
                  <FlyerCard e={e} today={today} />
                </div>
              ))}
            </div>
          ) : (
            <Quiet>No one-off events pinned for the next 7 days yet. Classes run all week.</Quiet>
          )}
        </section>

        <section aria-labelledby="h-morning" className="flex flex-col gap-2.5">
          <Heading id="h-morning" hi="कल सुबह" title="Morning practice, tomorrow" aside={formatDate(addDays(today, 1))} />
          {morning.length ? morning.map((o) => <SessionRow key={`${o.id}${o.occ.start_time}`} item={o} />) : <Quiet>Nothing pinned for tomorrow morning yet.</Quiet>}
        </section>

        <div className="flex flex-col gap-3">
          <Link href="/flyers" className="flex min-h-[52px] items-center justify-center rounded-full bg-ink text-[17px] font-bold text-wall">
            See all {week.wall.length} flyer{week.wall.length === 1 ? "" : "s"}, with filters
          </Link>
          <Link href="/post" className="flex flex-col gap-0.5 border-[1.5px] border-dashed border-ink px-4 py-3.5">
            <span className="text-[17px] font-extrabold">Organising something?</span>
            <span className="text-[16px] text-ink-2">Pin your flyer. Checked the same day. ₹50 for 4 weeks, paid after it&apos;s checked.</span>
          </Link>
        </div>
      </div>

      <aside className="mt-9 hidden flex-col gap-7 lg:mt-0 lg:flex">
        <section aria-labelledby="h-tonight-d" className="flex flex-col gap-2.5">
          <Tonight tonight={tonight} now={now} id="h-tonight-d" />
        </section>
        <Link href="/map" className="flex min-h-11 items-center gap-2 text-[17px] font-bold text-act-ink">
          <Icon name="map" /> Open the map
        </Link>
      </aside>
    </div>
  );
}

async function Tonight({ tonight, now, id = "h-tonight" }: { tonight: AgendaItem[]; now: string; id?: string }) {
  return (
    <>
      <Heading id={id} hi="आज रात" title="Tonight, from 6pm" aside={tonight.length ? `${tonight.length} thing${tonight.length === 1 ? "" : "s"}` : undefined} />
      {tonight.map((o) => (
        <SessionRow key={`${o.id}${o.occ.start_time}`} item={o} showStarted now={now} />
      ))}
      <Suspense fallback={null}>
        <GangaDaily compact />
      </Suspense>
      {tonight.length ? null : <Quiet>No flyers for tonight yet. The aarti is on, as every evening.</Quiet>}
    </>
  );
}

function Heading({ id, hi, title, aside }: { id: string; hi: string; title: string; aside?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <h2 id={id} className="text-[21px] leading-tight font-extrabold lg:text-[24px]">
        <span lang="hi" className="hi">
          {hi}
        </span>
        {title}
      </h2>
      {aside ? <span className="pb-0.5 text-[15px] font-semibold whitespace-nowrap text-muted">{aside}</span> : null}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="border-[1.5px] border-dashed border-line-strong px-4 py-3 text-[16px] leading-snug text-ink-2">{children}</p>;
}

function WallSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 w-44 bg-wall-2" />
      <div className="mt-4 columns-2 gap-3 sm:columns-3">
        {[180, 120, 200, 150].map((h, i) => (
          <div key={i} className="mb-7 break-inside-avoid">
            <div className="bg-wall-2" style={{ height: h }} />
            <div className="mx-1.5 -mt-3 h-16 bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
