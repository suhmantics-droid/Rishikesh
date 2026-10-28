import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryTag, DateBlock, tiltFor, WeekStrip } from "@/components/FlyerCard";
import { Icon } from "@/components/Icon";
import { FollowButton } from "@/components/Follow";
import { MiniMap } from "@/components/MiniMap";
import { PushToggle } from "@/components/PushToggle";
import { ReportLink, ShareBar } from "@/components/ShareBar";
import { PlanButton } from "@/components/Plan";
import { EventTracker } from "@/components/Track";
import { LiveBadge, WalkTime } from "@/components/Live";
import { Timetable } from "@/components/Timetable";
import { getEventBySlug, isOver, pinEvent, scheduleDays } from "@/lib/data";
import { eventStats } from "@/lib/stats";
import { daysLabel, formatDay, formatDayLong, formatTime, formatTimeRange, nowTimeIST, todayIST, weekday } from "@/lib/dates";
import { area, category, SITE } from "@/lib/site";
import { googleCalendarLink } from "@/lib/ics";
import { LINK_LABELS } from "@/lib/links";
import { directionsLink, flyerUrl, googleListingLink, instagramHandle, priceLabel, safeUrl, whatsappNumber } from "@/lib/util";

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
  const stats = await eventStats(d.event.id);

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
    ? `${event.title}: ${daysLabel(days)} at ${venue.name}, Tapovan`
    : `${event.title}${next ? `, ${formatDayLong(next.date, today)} ${formatTimeRange(next.start_time, next.end_time)}` : ""} at ${venue.name}, Tapovan (${priceLabel(event)})`;

  const daysAway = next ? Math.round((Date.parse(next.date) - Date.parse(today)) / 86_400_000) : null;
  const away = daysAway == null ? null : daysAway === 0 ? "today" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;
  const price = priceLabel(event);
  const note = event.price_note && event.price_note !== price ? event.price_note : null;
  const tilt = tiltFor(event.id);
  const certainty = venue.lat == null || venue.lng == null ? "request" : venue.coords_verified ? "exact" : "approx";

  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-8 lg:px-12 lg:pt-6">
      {isLive && !isClasses ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd(d, upcoming.slice(0, 10))).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <nav className="mb-2">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-[17px] font-bold">
          <Icon name="back" /> What&apos;s on
        </Link>
      </nav>
      {!isLive ? (
        <div className="mb-4 border-[1.5px] border-line-strong bg-wall-2 p-4 text-[16px]">
          This flyer is no longer on the wall{upcoming.length === 0 ? ": the event has passed" : ""}.{" "}
          <Link href="/" className="font-bold underline">
            See what&apos;s on now
          </Link>
        </div>
      ) : null}
      {event.is_demo ? <div className="mb-4 border-[1.5px] border-dashed border-line-strong p-3 text-[16px] text-muted">Sample listing for demonstration, not a real event.</div> : null}

      <div className="grid gap-7 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:gap-14">
        <figure className="flex flex-col">
          {img ? (
            <a href={img} target="_blank" rel="noreferrer" aria-label="See the flyer full size" className="tilt block" style={{ transform: `rotate(${tilt * 0.5}deg)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={`Flyer for ${event.title}`}
                width={event.flyer_w ?? undefined}
                height={event.flyer_h ?? undefined}
                className="block h-auto w-full bg-wall-2 shadow-e2"
              />
            </a>
          ) : null}
          <div className={`tilt relative -mt-5 mr-2 ml-5 flex flex-col gap-1 bg-slip px-4 py-3 text-slip-ink shadow-e1 lg:ml-24 ${!next?.start_time ? "border-[1.5px] border-dashed border-line-strong" : ""}`} style={{ transform: `rotate(${-tilt * 0.7}deg)` }}>
            <span className="tape" aria-hidden />
            {next ? <LiveBadge date={next.date} start={next.start_time} end={next.end_time} className="self-start" /> : null}
            {isClasses ? (
              <>
                <WeekStrip days={days} todayWd={weekday(today)} size="md" />
                <span className="slip-time !text-[20px]">
                  {next ? (next.start_time ? `Next: ${formatDay(next.date, today).toLowerCase()} ${formatTime(next.start_time)}` : `Next: ${formatDay(next.date, today)}, time not listed`) : "No upcoming sessions"}
                </span>
                {next?.label ? <span className="text-[17px] font-semibold">{next.label}</span> : null}
              </>
            ) : next ? (
              <span className="flex items-center gap-3">
                <DateBlock date={next.date} />
                <span className="flex flex-col">
                  <span className="slip-time !text-[22px]">{formatTimeRange(next.start_time, next.end_time) || "Time not listed"}</span>
                  <span className="slip-time">
                    {price}
                    {away ? ` · ${away}` : ""}
                  </span>
                </span>
              </span>
            ) : (
              <span className="slip-time">No upcoming dates</span>
            )}
          </div>
          {img ? <figcaption className="mt-2 text-center text-[14px] text-muted">Tap the flyer to see it full size</figcaption> : null}
        </figure>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2">
              <CategoryTag cat={event.category} />
              <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">· {isClasses ? "drop-in classes" : "one-off event"}</span>
            </span>
            <h1 className="text-[32px] leading-[1.08] font-extrabold [font-stretch:88%] lg:text-[44px]">{event.title}</h1>
            {event.organiser_name ? <p className="text-[17px] text-ink-2">by {event.organiser_name}</p> : null}
          </div>

          <dl className="bg-surface px-4 py-1 text-[17px] shadow-[0_1px_0_rgb(0_0_0/0.06)]">
            <div className="grid grid-cols-[72px_1fr] gap-3 py-3">
              <dt className="text-[16px] font-bold text-muted">When</dt>
              <dd className="flex flex-col gap-0.5">
                {isClasses ? (
                  <>
                    <span className="font-bold">{daysLabel(days)} · regular classes</span>
                    {next ? (
                      <span className="text-ink-2">
                        Next: {formatDayLong(next.date, today).split(" · ")[0]} {formatTime(next.start_time) || "(time not listed)"}
                        {next.label ? ` · ${next.label}` : ""}
                      </span>
                    ) : null}
                  </>
                ) : upcoming.length ? (
                  upcoming.slice(0, 8).map((x) => (
                    <span key={`${x.date}${x.start_time}`} className="font-bold">
                      {formatDayLong(x.date, today)} <span className="font-normal text-ink-2">{formatTimeRange(x.start_time, x.end_time) || "time not listed"}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-muted">No upcoming dates</span>
                )}
                {!isClasses && upcoming.length === 1 ? <span className="text-[16px] text-ink-2">One date only</span> : null}
                {!isClasses && upcoming.length > 8 ? <span className="text-[16px] text-muted">+{upcoming.length - 8} more dates</span> : null}
              </dd>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-3 border-t border-line py-3">
              <dt className="text-[16px] font-bold text-muted">Price</dt>
              <dd>
                <span className="font-bold">{price}</span>
                {note ? <span className="block text-[16px] text-ink-2">{note}</span> : null}
              </dd>
            </div>
            <div className="grid grid-cols-[72px_1fr] gap-3 border-t border-line py-3">
              <dt className="text-[16px] font-bold text-muted">Where</dt>
              <dd className="flex flex-col gap-1">
                <Link href={`/v/${venue.slug}`} className="font-bold underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                  {venue.name}
                </Link>
                <span className="text-[16px] text-ink-2">{[venue.address, area(venue.area).label].filter((x, i, all) => x && all.indexOf(x) === i).join(" · ")}</span>
                <span className="inline-flex items-center gap-1.5 text-[16px] font-bold">
                  <Icon name={certainty === "exact" ? "place-exact" : certainty === "approx" ? "place-approx" : "place-request"} size={18} />
                  {certainty === "exact" ? "Exact spot" : certainty === "approx" ? "Approximate spot" : "Exact spot from the organiser"}
                </span>
                <WalkTime lat={venue.lat} lng={venue.lng} className="text-[16px] font-bold text-act-ink" />
              </dd>
            </div>
            {artists.length ? (
              <div className="grid grid-cols-[72px_1fr] gap-3 border-t border-line py-3">
                <dt className="text-[16px] font-bold text-muted">With</dt>
                <dd className="flex flex-wrap gap-x-3 gap-y-1">
                  {artists.map((a) => (
                    <Link key={a.slug} href={`/a/${a.slug}`} className="font-bold underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      {a.name}
                    </Link>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>

          {/* Save stays within thumb reach on a phone: pinned above the tab bar for the whole page. */}
          <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-line bg-wall/95 px-4 py-2.5 backdrop-blur max-lg:order-last lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
            <PlanButton slug={event.slug} eventId={event.id} initial={stats.interested ?? 0} />
          </div>
          <ShareBar title={event.title} text={shareText} calendarHref={isClasses ? null : `/e/${event.slug}/calendar`} />
          {!isClasses && next ? (
            <a
              data-track="calendar"
              href={googleCalendarLink({
                title: event.title,
                date: next.date,
                start_time: next.start_time,
                end_time: next.end_time,
                location: `${venue.name}, Tapovan, Rishikesh`,
                description: `${event.description ?? ""}\n\n${SITE.url}/e/${event.slug}`.trim(),
                url: `${SITE.url}/e/${event.slug}`,
              })}
              target="_blank"
              rel="noreferrer"
              className="-mt-4 inline-flex min-h-11 items-center gap-1.5 self-start text-[16px] font-bold underline"
            >
              <Icon name="calendar" size={18} /> Add to Google Calendar
            </a>
          ) : null}

          {isClasses && d.schedule?.sessions.length ? (
            <Timetable sessions={d.schedule.sessions} todayWd={weekday(today)} fallbackLabel={event.title} />
          ) : null}

          {event.description ? (
            <section className="flex flex-col gap-2">
              <h2 className="text-[21px] font-extrabold">About</h2>
              <p className="text-[17px] leading-relaxed whitespace-pre-line text-ink-2">{event.description}</p>
            </section>
          ) : null}

          {wa || ig || booking ? (
            <div className="flex flex-wrap gap-2">
              {wa ? (
                <a
                  data-track="whatsapp"
                  href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi! I saw your flyer for "${event.title}" on ${SITE.name}. `)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-[16px] font-bold"
                >
                  <Icon name="message" size={18} /> {isClasses ? "Message on WhatsApp to book" : "Message the organiser"}
                </a>
              ) : null}
              {ig ? (
                <a data-track="instagram" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-[16px] font-bold">
                  <Icon name="camera" size={18} /> @{ig}
                </a>
              ) : null}
              {booking ? (
                <a data-track="booking" href={booking} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-[16px] font-bold">
                  More info from the organiser <Icon name="external" size={16} />
                </a>
              ) : null}
            </div>
          ) : null}

          {qrLinks.length ? (
            <div className="bg-surface p-4">
              <p className="flex items-center gap-2 text-[16px] font-bold">
                <QrIcon /> From the QR codes on this flyer
              </p>
              <p className="mb-3 text-[15px] text-ink-2">You can&apos;t scan a code on your own screen, so here they are as links.</p>
              <div className="flex flex-wrap gap-2">
                {qrLinks.map((l) => (
                  <a
                    key={l.url}
                    data-track={l.kind === "whatsapp" || l.kind === "whatsapp-group" ? "whatsapp" : l.kind === "map" ? "directions" : "booking"}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-line-strong px-4 text-[16px] font-bold hover:border-ink"
                  >
                    {LINK_LABELS[l.kind]} <Icon name="external" size={16} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {certainty === "request" ? (
            <AskWhere title={event.title} phone={event.contact_phone} instagram={event.contact_instagram} venue={venue.name} />
          ) : (
            <section className="flex flex-col gap-3" aria-label="Getting there">
              <MiniMap
                today={today}
                pins={[
                  {
                    slug: venue.slug,
                    name: venue.name,
                    area: venue.area,
                    lat: venue.lat!,
                    lng: venue.lng!,
                    coords_verified: venue.coords_verified,
                    events: [pinEvent({ ...event, kind: isClasses ? "classes" : "event", days }, next ?? { date: today, start_time: null, end_time: null })],
                  },
                ]}
              />
              {venue.address ? (
                <p className="text-[16px] text-ink-2">
                  <b className="text-ink">From the organiser:</b> {venue.address}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <a
                  data-track="directions"
                  href={!venue.coords_verified && mapLink ? mapLink : directionsLink(venue)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-act px-5 text-[16px] font-bold text-on-act"
                >
                  <Icon name="directions" size={18} /> {certainty === "approx" && !mapLink ? "Directions to the area" : "Directions"}
                </a>
                <a href={googleListingLink(venue)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-1.5 text-[16px] font-bold underline">
                  {venue.name} on Google: reviews and photos
                </a>
              </div>
              {certainty === "approx" ? <p className="text-[15px] text-ink-2">The pin is approximate. Confirm the exact spot with the organiser.</p> : null}
            </section>
          )}

          <div className="flex flex-col gap-3 bg-surface p-4">
            <h2 className="text-[19px] font-extrabold">Hear about the next one</h2>
            <p className="text-[16px] text-ink-2">A notification on this phone when they pin a new flyer. No account.</p>
            <div className="flex flex-wrap gap-2">
              <FollowButton kind="venue" target={venue.slug} label={venue.name} chip />
              <FollowButton kind="category" target={event.category} label={cat.label} chip />
              {artists.map((a) => (
                <FollowButton key={a.slug} kind="artist" target={a.slug} label={a.name} chip />
              ))}
            </div>
            <PushToggle compact />
            <Link href="/alerts" className="inline-flex min-h-11 items-center text-[16px] font-bold underline">
              More alert options
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[15px] text-ink-2">{SITE.name} checked these details against the flyer. It&apos;s a listing, not a recommendation.</p>
            <ReportLink eventId={event.id} />
          </div>
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

/** The flyer doesn't say exactly where: one tap to ask the organiser. */
function AskWhere({ title, phone, instagram, venue }: { title: string; phone: string | null; instagram: string | null; venue: string }) {
  const wa = whatsappNumber(phone);
  const ig = instagramHandle(instagram);
  const text = `Hi! I saw your flyer for "${title}" on ${SITE.name}. Where exactly is it in Tapovan?`;
  return (
    <div className="flex flex-col gap-2 border-[1.5px] border-dashed border-line-strong bg-surface p-4">
      <p className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">Not on the map · spot on request</p>
      <p className="text-[17px] font-bold">{venue}, Tapovan</p>
      <p className="text-[16px] text-ink-2">The flyer doesn&apos;t give the exact spot, so there&apos;s no pin. Ask the organiser:</p>
      {wa ? (
        <a data-track="whatsapp" href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-act px-5 text-[16px] font-bold text-on-act">
          <Icon name="message" size={18} /> Ask on WhatsApp
        </a>
      ) : ig ? (
        <a data-track="instagram" href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-act px-5 text-[16px] font-bold text-on-act">
          <Icon name="camera" size={18} /> Ask @{ig} on Instagram
        </a>
      ) : (
        <p className="text-[16px]">Ask at any cafe nearby, or check the flyer for a contact.</p>
      )}
    </div>
  );
}
