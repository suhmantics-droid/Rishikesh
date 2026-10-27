import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryTag } from "@/components/FlyerCard";
import { FollowButton } from "@/components/Follow";
import { MiniMap } from "@/components/MiniMap";
import { PushToggle } from "@/components/PushToggle";
import { ReportLink, ShareBar } from "@/components/ShareBar";
import { WhatsAppIcon } from "@/components/Browse";
import { PlanButton } from "@/components/Plan";
import { EventTracker } from "@/components/Track";
import { LiveBadge, WalkTime } from "@/components/Live";
import { Timetable } from "@/components/Timetable";
import { getEventBySlug, isOver, pinEvent, scheduleDays } from "@/lib/data";
import { eventStats } from "@/lib/stats";
import { daysLabel, formatDayLong, formatTime, formatTimeRange, nowTimeIST, todayIST, weekday } from "@/lib/dates";
import { area, category, SITE } from "@/lib/site";
import { LINK_LABELS } from "@/lib/links";
import { directionsLink, flyerUrl, instagramHandle, priceLabel, safeUrl, whatsappNumber } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/e/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const d = await getEventBySlug(slug);
  if (!d) return { title: "Flyer not found" };
  const next = d.dates.find((x) => x.date >= todayIST()) ?? d.dates[0];
  const when =
    d.event.kind === "classes"
      ? `${daysLabel(scheduleDays(d.schedule))} classes`
      : next
        ? `${formatDayLong(next.date)} ${formatTimeRange(next.start_time, next.end_time)}`
        : "";
  const img = flyerUrl(d.event.flyer);
  return {
    title: d.event.title,
    description: `${when} at ${d.venue.name}, Tapovan. ${priceLabel(d.event)}. ${d.event.description ?? ""}`.trim(),
    openGraph: img ? { images: [{ url: img, width: d.event.flyer_w ?? undefined, height: d.event.flyer_h ?? undefined }] } : undefined,
  };
}

export default function EventPage({ params }: PageProps<"/e/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl animate-pulse px-4 py-6"><div className="h-full rounded-2xl bg-paper-2" /></div>}>
      <EventDetail params={params} />
    </Suspense>
  );
}

async function EventDetail({ params }: { params: PageProps<"/e/[slug]">["params"] }) {
  const { slug } = await params;
  const d = await getEventBySlug(slug);
  // Expired listings keep their page (links in WhatsApp groups live forever); unpaid/hidden ones don't.
  if (!d || d.event.status !== "live") notFound();
  const stats = eventStats(d.event.id);

  const { event, venue, artists, isLive, links } = d;
  const today = todayIST();
  const now = nowTimeIST();
  // Sessions earlier today that have finished don't count as "next".
  const upcoming = d.dates.filter((x) => x.date >= today && !isOver(x, today, now));
  const cat = category(event.category);
  const img = flyerUrl(event.flyer);
  const wa = whatsappNumber(event.contact_phone);
  const ig = instagramHandle(event.contact_instagram);
  const booking = safeUrl(event.booking_url);
  // Links from the flyer's QR codes, minus any we already show as a button.
  const qrLinks = links.filter((l) => l.url !== booking && !(l.kind === "whatsapp" && wa && l.url.includes(wa)));
  const mapLink = links.find((l) => l.kind === "map")?.url;
  const next = upcoming[0];
  const isClasses = event.kind === "classes";
  const days = scheduleDays(d.schedule);
  const shareText = isClasses
    ? `📌 ${event.title} — ${daysLabel(days)} @ ${venue.name}, Tapovan`
    : `📌 ${event.title}${next ? ` — ${formatDayLong(next.date, today)} ${formatTimeRange(next.start_time, next.end_time)}` : ""} @ ${venue.name}, Tapovan (${priceLabel(event)})`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-8">
      {isLive && !isClasses ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(d, upcoming.slice(0, 10))).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <nav className="mb-3 text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          ← All flyers
        </Link>
      </nav>
      {!isLive ? (
        <div className="mb-4 rounded-2xl border border-line bg-paper-2 p-4 text-sm">
          This flyer is no longer on the board{upcoming.length === 0 ? " — the event has passed" : ""}.{" "}
          <Link href="/" className="font-semibold underline">
            See what&apos;s on now
          </Link>
        </div>
      ) : null}
      {event.is_demo ? (
        <div className="mb-4 rounded-2xl border border-dashed border-line p-3 text-sm text-muted">Sample listing for demonstration — not a real event.</div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          {img ? (
            <a href={img} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-line bg-card shadow-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Flyer for ${event.title}`}
                width={event.flyer_w ?? undefined}
                height={event.flyer_h ?? undefined}
                className="h-auto w-full"
              />
            </a>
          ) : null}
          <p className="mt-2 text-center text-xs text-muted">Tap the flyer to see it full size</p>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2">
              <CategoryTag cat={event.category} />
              {next ? <LiveBadge date={next.date} start={next.start_time} end={next.end_time} /> : null}
            </div>
            <h1 className="mt-1 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
            {event.organiser_name ? <p className="mt-1 text-sm text-muted">by {event.organiser_name}</p> : null}
          </div>

          <dl className="grid gap-3 rounded-2xl border border-line bg-card p-4 text-[15px]">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-sm font-semibold text-muted">When</dt>
              <dd className="flex flex-col gap-0.5">
                {isClasses ? (
                  <>
                    <span className="font-semibold">{daysLabel(days)} · regular classes</span>
                    {next ? (
                      <span className="text-ink-2">
                        Next: <b className={next.date === today ? "text-saffron-ink" : ""}>{formatDayLong(next.date, today).split(" · ")[0]} {formatTime(next.start_time)}</b>
                        {next.label ? ` · ${next.label}` : ""}
                      </span>
                    ) : null}
                  </>
                ) : upcoming.length ? (
                  upcoming.slice(0, 8).map((x) => (
                    <span key={`${x.date}${x.start_time}`} className={x.date === today ? "font-bold text-saffron-ink" : "font-semibold"}>
                      {formatDayLong(x.date, today)} <span className="font-normal text-ink-2">{formatTimeRange(x.start_time, x.end_time)}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No upcoming dates</span>
                )}
                {!isClasses && upcoming.length > 8 ? <span className="text-sm text-muted">+{upcoming.length - 8} more dates</span> : null}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-sm font-semibold text-muted">Where</dt>
              <dd>
                <Link href={`/v/${venue.slug}`} className="font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                  {venue.name}
                </Link>
                <div className="text-sm text-muted">
                  {[venue.address, area(venue.area).label].filter((x, i, all) => x && all.indexOf(x) === i).join(" · ")}
                </div>
                <WalkTime lat={venue.lat} lng={venue.lng} className="text-sm font-semibold text-ganga" />
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 text-sm font-semibold text-muted">Price</dt>
              <dd className="font-semibold">
                {priceLabel(event)}
                {event.price_note && priceLabel(event) !== event.price_note ? <span className="font-normal text-ink-2"> · {event.price_note}</span> : null}
              </dd>
            </div>
            {artists.length ? (
              <div className="flex gap-3">
                <dt className="w-16 shrink-0 text-sm font-semibold text-muted">With</dt>
                <dd className="flex flex-col gap-2">
                  {artists.map((a) => (
                    <div key={a.slug} className="flex flex-wrap items-center gap-2">
                      <Link href={`/a/${a.slug}`} className="font-semibold underline decoration-line underline-offset-4 hover:decoration-ink">
                        {a.name}
                      </Link>
                    </div>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          {isClasses && d.schedule?.sessions.length ? (
            <Timetable sessions={d.schedule.sessions} todayWd={weekday(today)} fallbackLabel={event.title} />
          ) : null}

          {event.description ? <p className="text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{event.description}</p> : null}

          {wa || ig || booking ? (
            <div className="flex flex-wrap gap-2">
              {wa ? (
                <a
                  data-track="whatsapp"
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I saw your flyer for "${event.title}" on ${SITE.name}. `)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white"
                >
                  <WhatsAppIcon className="h-4 w-4 [&_path]:fill-white" /> Message organiser
                </a>
              ) : null}
              {ig ? (
                <a data-track="instagram" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold">
                  @{ig}
                </a>
              ) : null}
              {booking ? (
                <a data-track="booking" href={booking} target="_blank" rel="noreferrer" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paper">
                  Book / more info ↗
                </a>
              ) : null}
            </div>
          ) : null}

          {qrLinks.length ? (
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-bold">
                <QrIcon /> From the QR codes on this flyer
              </p>
              <p className="mb-3 text-sm text-muted">Can&apos;t scan a code on your own screen — so here they are as links.</p>
              <div className="flex flex-wrap gap-2">
                {qrLinks.map((l) => (
                  <a
                    key={l.url}
                    data-track={l.kind === "whatsapp" || l.kind === "whatsapp-group" ? "whatsapp" : l.kind === "map" ? "directions" : "booking"}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-line bg-paper px-3 py-2 text-sm font-bold hover:border-ink-2"
                  >
                    {LINK_LABELS[l.kind]} ↗
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <PlanButton slug={event.slug} eventId={event.id} initial={stats.interested ?? 0} />
          </div>

          <ShareBar title={event.title} text={shareText} calendarHref={isClasses ? null : `/e/${event.slug}/calendar`} />

          <div className="flex flex-col gap-3">
            {venue.lat != null && venue.lng != null ? (
              <MiniMap
                today={today}
                pins={[{ slug: venue.slug, name: venue.name, area: venue.area, lat: venue.lat, lng: venue.lng, events: [pinEvent({ ...event, kind: isClasses ? "classes" : "event", days }, next ?? { date: today, start_time: null, end_time: null })] }]}
              />
            ) : null}
            <a
              data-track="directions"
              href={!venue.coords_verified && mapLink ? mapLink : directionsLink(venue)}
              target="_blank"
              rel="noreferrer"
              className="self-start rounded-xl bg-ganga px-4 py-2.5 text-sm font-bold text-on-ganga"
            >
              Directions (Google Maps) ↗
            </a>
            {!venue.coords_verified ? <p className="text-xs text-muted">Map pin is approximate — use Directions for the exact spot.</p> : null}
          </div>

          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm font-bold">Hear about the next one</p>
            <p className="mb-3 text-sm text-muted">Follow, then get a notification on your phone (or an email) when their next flyer goes up.</p>
            <div className="flex flex-wrap gap-2">
              <FollowButton kind="venue" target={venue.slug} label={venue.name} chip />
              <FollowButton kind="category" target={event.category} label={cat.label} chip />
              {artists.map((a) => (
                <FollowButton key={a.slug} kind="artist" target={a.slug} label={a.name} chip />
              ))}
            </div>
            <div className="mt-3">
              <PushToggle compact />
            </div>
            <Link href="/alerts" className="mt-2 inline-block text-sm font-bold text-saffron-ink underline">
              More alert options →
            </Link>
          </div>

          <ReportLink eventId={event.id} />
          <EventTracker eventId={event.id} />
        </div>
      </div>
    </div>
  );
}

function QrIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 17h4v4h-4z" />
    </svg>
  );
}

/** schema.org Event data so search engines can list each date in their event results. */
function eventJsonLd(d: NonNullable<Awaited<ReturnType<typeof getEventBySlug>>>, dates: { date: string; start_time: string | null; end_time: string | null }[]) {
  const { event, venue, artists } = d;
  const url = new URL(`/e/${event.slug}`, SITE.url).toString();
  const at = (date: string, time: string | null) => (time ? `${date}T${time}:00+05:30` : date);
  const place = {
    "@type": "Place",
    name: venue.name,
    address: { "@type": "PostalAddress", streetAddress: venue.address ?? undefined, addressLocality: "Rishikesh", addressRegion: "Uttarakhand", addressCountry: "IN" },
    geo: venue.lat != null && venue.lng != null ? { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng } : undefined,
  };
  const offers =
    event.price_type === "free"
      ? { "@type": "Offer", price: 0, priceCurrency: "INR", url, availability: "https://schema.org/InStock" }
      : event.price_type === "paid" && event.price_min
        ? { "@type": "Offer", price: event.price_min, priceCurrency: "INR", url, availability: "https://schema.org/InStock" }
        : undefined;
  return dates.map((o) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: at(o.date, o.start_time),
    endDate: o.end_time && o.start_time && o.end_time > o.start_time ? at(o.date, o.end_time) : undefined,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: place,
    image: event.flyer ? [new URL(`/f/${event.flyer}.webp`, SITE.url).toString()] : undefined,
    offers,
    isAccessibleForFree: event.price_type === "free" || event.price_type === "donation" ? true : undefined,
    performer: artists.length ? artists.map((a) => ({ "@type": "PerformingGroup", name: a.name })) : undefined,
    organizer: event.organiser_name ? { "@type": "Organization", name: event.organiser_name, url } : undefined,
    url,
  }));
}
