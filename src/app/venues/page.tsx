import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowButton } from "@/components/Follow";
import { GoogleRating } from "@/components/VenueBadges";
import { listVenuesWithCounts } from "@/lib/data";
import { formatDayLong, todayIST } from "@/lib/dates";
import { area, AREAS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Venues",
  description: "Cafes, shalas and stages in Tapovan, Laxman Jhula and Ram Jhula — and what's on at each.",
};

export default function VenuesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-semibold text-saffron-ink">Directory</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Venues</h1>
      <p className="mt-2 mb-8 max-w-xl text-ink-2">The cafes, shalas and stages where things happen. Follow a venue to hear when its next flyer goes up.</p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-2" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const showDemo = process.env.NODE_ENV !== "production";
  const venues = (await listVenuesWithCounts()).filter((v) => showDemo || !v.is_demo);
  const recommended = venues.filter((v) => v.recommended);
  const today = todayIST();
  return (
    <div className="grid gap-10">
      {recommended.length ? (
        <section>
          <h2 className="mb-3 border-b border-line pb-2 font-display text-2xl font-semibold">✦ Recommended</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {recommended.map((v) => (
              <li key={v.slug} className="flex items-start justify-between gap-3 rounded-2xl border-2 border-saffron/40 bg-card p-4">
                <div className="min-w-0">
                  <Link href={`/v/${v.slug}`} className="font-display text-lg font-semibold hover:underline">
                    {v.name}
                  </Link>
                  <p className="text-sm text-muted">{[v.kind, area(v.area).label].filter(Boolean).join(" · ")}</p>
                  <div className="mt-1">
                    <GoogleRating venue={v} />
                  </div>
                  {v.description ? <p className="mt-1 line-clamp-2 text-sm text-ink-2">{v.description}</p> : null}
                </div>
                <FollowButton kind="venue" target={v.slug} label={v.name} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {AREAS.map((a) => {
        const list = venues.filter((v) => v.area === a.key && !v.recommended);
        if (!list.length) return null;
        return (
          <section key={a.key}>
            <h2 className="mb-3 border-b border-line pb-2 font-display text-2xl font-semibold">{a.label}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((v) => (
                <li key={v.slug} className="flex items-start justify-between gap-3 rounded-2xl border border-line bg-card p-4">
                  <div className="min-w-0">
                    <Link href={`/v/${v.slug}`} className="font-display text-lg font-semibold hover:underline">
                      {v.name}
                    </Link>
                    <p className="text-sm text-muted">
                      {v.upcoming
                        ? `${v.upcoming} flyer${v.upcoming === 1 ? "" : "s"} up · next ${formatDayLong(v.next_date!, today)}`
                        : "Nothing pinned right now"}
                    </p>
                    {v.description ? <p className="mt-1 line-clamp-2 text-sm text-ink-2">{v.description}</p> : null}
                  </div>
                  <FollowButton kind="venue" target={v.slug} label={v.name} compact />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
