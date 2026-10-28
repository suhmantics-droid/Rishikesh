import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlyerGrid } from "@/components/FlyerCard";
import { FollowButton } from "@/components/Follow";
import { MiniMap } from "@/components/MiniMap";
import { GoogleRating, RecommendedBadge } from "@/components/VenueBadges";
import { getVenue, getWhatsOn, pinEvent } from "@/lib/data";
import { area } from "@/lib/site";
import { directionsLink, googleListingLink, instagramHandle } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/v/[slug]">): Promise<Metadata> {
  const v = await getVenue((await params).slug);
  return v ? { title: `${v.name} — events`, description: `What's on at ${v.name}, ${area(v.area).label}, Rishikesh.` } : { title: "Venue not found" };
}

export default function VenuePage({ params }: PageProps<"/v/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse rounded-2xl bg-paper-2" />}>
      <Venue params={params} />
    </Suspense>
  );
}

async function Venue({ params }: { params: PageProps<"/v/[slug]">["params"] }) {
  const v = await getVenue((await params).slug);
  if (!v) notFound();
  const { wall, today } = await getWhatsOn({ when: "all", venue: v.slug });
  const ig = instagramHandle(v.instagram);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All flyers
      </Link>
      <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-semibold text-saffron-ink">
            {v.kind ? `${v.kind} · ` : ""}
            {area(v.area).label}
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{v.name}</h1>
          {v.recommended || v.google_rating ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              {v.recommended ? <RecommendedBadge /> : null}
              {v.google_rating ? <GoogleRating venue={v} /> : null}
            </div>
          ) : null}
          {v.description ? <p className="mt-2 max-w-xl text-ink-2">{v.description}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <FollowButton kind="venue" target={v.slug} label={v.name} />
            {v.lat != null && v.lng != null ? (
              <a href={directionsLink(v)} target="_blank" rel="noreferrer" className="rounded-full bg-ganga px-3 py-1.5 text-[13px] font-bold text-on-ganga">
                Directions ↗
              </a>
            ) : (
              <span className="rounded-full border border-dashed border-line px-3 py-1.5 text-[13px] font-semibold text-muted">📍 Exact spot on request: ask via a flyer</span>
            )}
            <a href={googleListingLink(v)} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold">
              ★ Google reviews ↗
            </a>
            {v.website ? (
              <a href={v.website} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold">
                Website ↗
              </a>
            ) : null}
            {ig ? (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold">
                @{ig}
              </a>
            ) : null}
          </div>
          <Link href={`/v/${v.slug}/poster`} className="mt-3 inline-block text-sm font-semibold text-muted underline hover:text-ink">
            🖨 Is this your place? Print a QR poster for your wall
          </Link>
          <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Upcoming here</h2>
          {wall.length ? (
            <FlyerGrid items={wall} today={today} />
          ) : (
            <p className="rounded-2xl border border-dashed border-line p-6 text-muted">
              No flyers up right now. Follow {v.name} and we&apos;ll email you when one goes up.
            </p>
          )}
        </div>
        {v.lat != null && v.lng != null ? (
          <MiniMap className="h-72 lg:sticky lg:top-20" today={today} pins={[{ slug: v.slug, name: v.name, area: v.area, lat: v.lat, lng: v.lng, coords_verified: v.coords_verified, events: wall.map((e) => pinEvent(e, e.next)) }]} />
        ) : null}
      </div>
    </div>
  );
}
