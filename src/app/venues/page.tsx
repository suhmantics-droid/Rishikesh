import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { GoogleRating } from "@/components/VenueBadges";
import { listVenuesWithCounts } from "@/lib/data";
import { formatDay, todayIST } from "@/lib/dates";
import { area, AREAS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Places",
  description: "Recommended places, places to stay, cafes, yoga, sound healing and Ayurveda, and the venues where things happen in Tapovan, with their Google ratings.",
};

const SHOWS = [
  { key: "all", label: "All" },
  { key: "recommended", label: "Recommended" },
  { key: "stays", label: "Stays" },
  { key: "eat", label: "Cafes" },
  { key: "wellness", label: "Wellness" },
  { key: "venues", label: "Venues" },
] as const;
type Show = (typeof SHOWS)[number]["key"];

export default function PlacesPage({ searchParams }: PageProps<"/venues">) {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-5 pb-8 lg:px-12 lg:pt-8">
      <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">Places</h1>
      <p className="mt-1 max-w-xl text-[16px] text-ink-2">
        Where things happen, where to stay and where to eat. Ratings are Google&apos;s. Recommended is our own pick and is never paid for.
      </p>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse bg-wall-2" />}>
        <List searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/**
 * Google rating, pulled towards 4.5 until a place has a few hundred reviews: the best-rated AND most-reviewed
 * come first, so a 5.0 from 100 reviews doesn't sit above a 4.7 from 8,000.
 */
const trusted = (v: { google_rating: number | null; google_reviews: number | null }) =>
  v.google_rating == null ? 0 : (v.google_rating * (v.google_reviews ?? 0) + 4.5 * 200) / ((v.google_reviews ?? 0) + 200);

type V = Awaited<ReturnType<typeof listVenuesWithCounts>>[number];

async function List({ searchParams }: { searchParams: PageProps<"/venues">["searchParams"] }) {
  const sp = await searchParams;
  const show: Show = SHOWS.some((s) => s.key === sp.show) ? (sp.show as Show) : "all";
  const showDemo = process.env.NODE_ENV !== "production";
  const venues = (await listVenuesWithCounts()).filter((v) => showDemo || !v.is_demo);
  const today = todayIST();
  const recommended = venues.filter((v) => v.recommended);
  const stays = venues.filter((v) => v.stay && !v.recommended).sort((a, b) => trusted(b) - trusted(a));
  const guide = (g: "eat" | "wellness") => venues.filter((v) => v.guide === g && !v.recommended && !v.stay).sort((a, b) => trusted(b) - trusted(a));
  const plain = venues.filter((v) => !v.recommended && !v.stay && !v.guide);

  const sections: { key: Show; title: string; note?: string; list: V[]; limit: number }[] = [
    { key: "recommended", title: "Recommended", note: "Our own picks. Never paid for.", list: recommended, limit: 99 },
    { key: "stays", title: "Places to stay", list: stays, limit: 4 },
    { key: "wellness", title: "Yoga, sound healing and Ayurveda", list: guide("wellness"), limit: 4 },
    { key: "eat", title: "Cafes and food", list: guide("eat"), limit: 4 },
  ];

  return (
    <>
      <nav aria-label="Show" className="no-scrollbar -mx-4 mt-4 mb-6 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {SHOWS.map((s) => (
          <Link
            key={s.key}
            href={s.key === "all" ? "/venues" : `/venues?show=${s.key}`}
            replace
            scroll={false}
            aria-current={show === s.key ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-ink px-4 text-[16px] font-semibold whitespace-nowrap ${
              show === s.key ? "bg-ink text-wall" : "hover:bg-wall-2"
            }`}
          >
            {s.label}
          </Link>
        ))}
        <Link href="/artists" className="flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-ink px-4 text-[16px] font-semibold whitespace-nowrap hover:bg-wall-2">
          Musicians
        </Link>
      </nav>

      <div className="flex flex-col gap-9">
        {sections
          .filter((s) => (show === "all" || show === s.key) && s.list.length)
          .map((s) => {
            const shown = show === "all" ? s.list.slice(0, s.limit) : s.list;
            return (
              <section key={s.key} aria-labelledby={`h-${s.key}`} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id={`h-${s.key}`} className="text-[21px] leading-tight font-extrabold lg:text-[24px]">
                    {s.title}
                  </h2>
                  <span className="text-[15px] font-semibold text-muted">{s.list.length}</span>
                </div>
                {s.note ? <p className="-mt-1 text-[15px] text-muted">{s.note}</p> : null}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {shown.map((v) => (
                    <li key={v.slug}>
                      <PlaceRow v={v} today={today} rec={s.key === "recommended"} />
                    </li>
                  ))}
                </ul>
                {shown.length < s.list.length ? (
                  <Link href={`/venues?show=${s.key}`} className="flex min-h-11 items-center gap-1 self-start text-[16px] font-bold text-act-ink">
                    All {s.list.length} <Icon name="next" size={18} />
                  </Link>
                ) : null}
              </section>
            );
          })}

        {show === "all" || show === "venues"
          ? AREAS.map((a) => {
              const list = plain.filter((v) => v.area === a.key).sort((x, y) => y.upcoming - x.upcoming || x.name.localeCompare(y.name));
              if (!list.length) return null;
              return (
                <section key={a.key} aria-labelledby={`h-${a.key}`} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 id={`h-${a.key}`} className="text-[21px] leading-tight font-extrabold lg:text-[24px]">
                      {a.label}
                    </h2>
                    <span className="text-[15px] font-semibold text-muted">
                      {list.length} venue{list.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((v) => (
                      <li key={v.slug}>
                        <PlaceRow v={v} today={today} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          : null}
      </div>
    </>
  );
}

function PlaceRow({ v, today, rec = false }: { v: V; today: string; rec?: boolean }) {
  const meta = [v.kind, area(v.area).label].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/v/${v.slug}`}
      className={`flex min-h-[64px] items-center justify-between gap-3 bg-surface px-4 py-3 shadow-e1 hover:bg-slip ${rec ? "border-l-4 border-sandal" : ""}`}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[17px] leading-tight font-bold">{v.name}</span>
        <span className="text-[15px] text-muted">{meta}</span>
        {v.upcoming ? (
          <span className="text-[15px] font-bold text-act-ink">
            {v.upcoming} flyer{v.upcoming === 1 ? "" : "s"} up{v.next_date ? ` · next ${formatDay(v.next_date, today)}` : ""}
          </span>
        ) : null}
      </span>
      <GoogleRating venue={v} link={false} className="shrink-0" />
    </Link>
  );
}
