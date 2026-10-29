import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlyerGrid } from "@/components/FlyerCard";
import { FollowButton } from "@/components/Follow";
import { Icon } from "@/components/Icon";
import { MiniMap } from "@/components/MiniMap";
import { GoogleRating, RecommendedBadge } from "@/components/VenueBadges";
import { getVenue, getWhatsOn, listVenuesWithCounts, pinEvent } from "@/lib/data";
import { area } from "@/lib/site";
import { directionsLink, googleListingLink, instagramHandle } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/v/[slug]">): Promise<Metadata> {
  const v = await getVenue((await params).slug);
  return v ? { title: v.name, description: `What's on at ${v.name}, ${area(v.area).label}, Rishikesh.` } : { title: "Place not found" };
}

export default function VenuePage({ params }: PageProps<"/v/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto mt-6 h-96 max-w-6xl animate-pulse bg-wall-2" />}>
      <Venue params={params} />
    </Suspense>
  );
}

async function Venue({ params }: { params: PageProps<"/v/[slug]">["params"] }) {
  const v = await getVenue((await params).slug);
  if (!v) notFound();
  const [{ wall, today }, all] = await Promise.all([getWhatsOn({ when: "all", venue: v.slug }), v.stay ? listVenuesWithCounts() : Promise.resolve([])]);
  const ig = instagramHandle(v.instagram);
  const kind = v.stay ? (v.kind ?? "Place to stay") : (v.kind ?? "Venue");
  const otherStays = all.filter((o) => o.stay && o.slug !== v.slug && !o.is_demo).sort((a, b) => (b.google_rating ?? 0) - (a.google_rating ?? 0)).slice(0, 3);
  const spot = v.lat == null ? "request" : v.coords_verified ? "exact" : "approx";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-8 lg:px-12 lg:pt-6">
      <Link href="/venues" className="inline-flex min-h-11 items-center gap-1 text-[16px] font-bold text-ink-2 hover:text-ink">
        <Icon name="back" size={18} /> Places
      </Link>
      <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">
              {kind} · {area(v.area).label}
            </span>
            <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">{v.name}</h1>
            {v.recommended ? (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <RecommendedBadge />
                <span className="text-[15px] text-muted">Our own pick. Never paid for.</span>
              </span>
            ) : null}
          </div>
          {v.description ? <p className="max-w-xl text-[17px] leading-relaxed text-ink-2">{v.description}</p> : null}
          {v.google_rating ? (
            <a href={googleListingLink(v)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-2 self-start">
              <GoogleRating venue={v} link={false} className="text-[17px]" />
              <span className="text-[16px] font-bold text-act-ink underline">Read the reviews on Google</span>
            </a>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {spot === "request" ? null : (
              <a
                href={directionsLink(v)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center gap-2 bg-act px-5 text-[16px] font-bold text-on-act"
              >
                <Icon name="directions" size={18} /> Directions
              </a>
            )}
            <FollowButton kind="venue" target={v.slug} label={v.name} compact />
          </div>
          <p className="flex items-start gap-2 text-[16px] text-ink-2">
            <Icon name={spot === "exact" ? "place-exact" : spot === "approx" ? "place-approx" : "place-request"} size={20} className="mt-0.5" />
            {spot === "exact"
              ? `${v.address ?? area(v.area).label}. The pin is checked.`
              : spot === "approx"
                ? `${v.address ?? area(v.area).label}. Approximate spot: directions go by the name, so check the last few steps.`
                : "Exact spot on request. Ask the organiser on any flyer here."}
          </p>
          {v.website || ig ? (
            <div className="flex flex-wrap gap-2">
              {v.website ? (
                <a href={v.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-[15px] font-semibold">
                  <Icon name="external" size={16} /> Website
                </a>
              ) : null}
              {ig ? (
                <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-[15px] font-semibold">
                  <Icon name="external" size={16} /> @{ig}
                </a>
              ) : null}
            </div>
          ) : null}
          {v.stay ? <p className="text-[15px] text-muted">We don&apos;t take bookings. Book with {v.name} directly.</p> : null}

          <section aria-labelledby="h-here" className="mt-4 flex flex-col gap-3">
            <h2 id="h-here" className="text-[21px] font-extrabold lg:text-[24px]">
              On the wall here
            </h2>
            {wall.length ? (
              <FlyerGrid items={wall} today={today} cols="columns-2 sm:columns-3" />
            ) : (
              <div className="flex flex-col gap-1 border-[1.5px] border-dashed border-line-strong px-4 py-4">
                <span className="text-[17px] font-bold">No flyers up right now</span>
                <span className="text-[16px] text-ink-2">
                  {v.stay ? "Hostels often host jams and talks. " : ""}Follow {v.name} to hear when the next one goes up.
                </span>
              </div>
            )}
          </section>

          {otherStays.length ? (
            <section aria-labelledby="h-stays" className="mt-4 flex flex-col gap-2">
              <h2 id="h-stays" className="text-[21px] font-extrabold">
                Other stays nearby
              </h2>
              {otherStays.map((o) => (
                <Link key={o.slug} href={`/v/${o.slug}`} className="flex min-h-14 items-center justify-between gap-3 bg-surface px-4 py-2.5 shadow-e1 hover:bg-slip">
                  <span className="flex flex-col">
                    <span className="text-[17px] font-bold">{o.name}</span>
                    <span className="text-[15px] text-muted">{area(o.area).label}</span>
                  </span>
                  <GoogleRating venue={o} link={false} />
                </Link>
              ))}
            </section>
          ) : null}

          <Link href={`/v/${v.slug}/poster`} className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-[16px] font-bold text-ink-2 underline hover:text-ink">
            <Icon name="post" size={18} /> Is this your place? Print a QR poster for your wall
          </Link>
        </div>
        {v.lat != null && v.lng != null ? (
          <MiniMap
            className="h-64 lg:sticky lg:top-24 lg:h-96"
            today={today}
            pins={[{ slug: v.slug, name: v.name, area: v.area, lat: v.lat, lng: v.lng, coords_verified: v.coords_verified, events: wall.map((e) => pinEvent(e, e.next)) }]}
          />
        ) : null}
      </div>
    </div>
  );
}
