import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/Icon";
import { ManageActions } from "@/components/ManageActions";
import { RememberListing } from "@/components/MyFlyers";
import { isAdmin } from "@/lib/admin";
import { getEventByToken } from "@/lib/data";
import { formatDayLong, formatTimeRange, todayIST } from "@/lib/dates";
import { payMode } from "@/lib/payments";
import { LISTING, rupees, SITE } from "@/lib/site";
import { eventStats } from "@/lib/stats";
import { listingStatus, STATUS_TONE } from "@/lib/status";
import { flyerUrl, priceLabel, whatsappNumber } from "@/lib/util";

export const metadata: Metadata = { title: "Your flyer", robots: { index: false } };

export default function ManagePage({ params, searchParams }: PageProps<"/manage/[token]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-3 pb-8 lg:pt-6">
      <Suspense fallback={<div className="h-96 animate-pulse bg-wall-2" />}>
        <Manage params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Manage({ params, searchParams }: Pick<PageProps<"/manage/[token]">, "params" | "searchParams">) {
  const { token } = await params;
  const sp = await searchParams;
  const d = await getEventByToken(token);
  if (!d) notFound();
  const { event, venue, dates } = d;
  const today = todayIST();
  const upcoming = dates.filter((x) => x.date >= today);
  const lastDate = upcoming[upcoming.length - 1]?.date;
  const needsRenewalForDates = d.isLive && lastDate && lastDate > event.live_until!;
  const admin = await isAdmin();
  const stats = await eventStats(event.id);
  const mode = await payMode();
  const st = listingStatus(event, d.isLive, today);
  const fee = rupees(LISTING.pricePaise);
  const weeks = LISTING.days / 7;

  return (
    <div className="flex flex-col gap-6">
      <RememberListing token={token} title={event.title} />
      <Link href="/manage" className="inline-flex min-h-11 items-center gap-1 self-start text-[16px] font-bold text-ink-2 hover:text-ink">
        <Icon name="back" size={18} /> My flyers
      </Link>

      {sp.paid ? (
        <div className="flex flex-col gap-1 bg-act p-5 text-on-act">
          <p className="text-[21px] font-extrabold">It&apos;s on the wall</p>
          <p className="text-[16px]">Your flyer is live. Keep this page&apos;s link to edit or renew it.</p>
        </div>
      ) : null}
      {sp.pending ? (
        <div className="flex flex-col gap-1 bg-now-soft p-5">
          <p className="text-[21px] font-extrabold">It&apos;s with us</p>
          <p className="text-[16px]">A person checks every flyer before it goes up. You&apos;ll hear on WhatsApp today.</p>
        </div>
      ) : null}
      {sp.saved ? <p className="bg-act-soft px-4 py-3 text-[16px] font-bold text-act-soft-ink">Changes saved.</p> : null}

      <div className="flex flex-col items-start gap-2">
        <span className="text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">Your flyer · private page, don&apos;t share this link</span>
        <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">{event.title}</h1>
        <span className={`border px-2.5 py-1 text-[14px] font-extrabold tracking-[0.04em] uppercase ${STATUS_TONE[st.key]}`}>{st.word}</span>
        <p className="text-[16px] text-ink-2">{st.detail}</p>
      </div>

      {st.key === "review" || st.key === "draft" ? (
        <ol className="flex flex-col gap-3 border-l-2 border-line-strong pl-4">
          <Step on={st.key === "review"} label="Now">
            In review. We check the date, time and place against your flyer.
          </Step>
          <Step label="Today">A WhatsApp message from {SITE.name}: it&apos;s approved, or one question.</Step>
          <Step label="Then">
            Pay {fee} and it goes up for {weeks} weeks. Nothing renews by itself.
          </Step>
        </ol>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        {event.flyer ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flyerUrl(event.flyer, "sm")!} alt="" className="w-full shadow-e1 max-sm:max-w-[180px]" />
        ) : null}
        <div className="flex flex-col gap-4">
          {event.status === "live" ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Views" value={event.views.toLocaleString("en-IN")} />
              <Stat label="Interested" value={String(stats.interested ?? 0)} />
              <Stat label="WhatsApp taps" value={String(stats.whatsapp ?? 0)} />
              <Stat label="Directions" value={String(stats.directions ?? 0)} />
              <Stat label="Calendar adds" value={String(stats.calendar ?? 0)} />
              <Stat label="Shares" value={String(stats.share ?? 0)} />
            </div>
          ) : null}
          <div className="flex flex-col gap-0.5 text-[16px] text-ink-2">
            <span className="font-bold text-ink">
              {venue.name} · {priceLabel(event)}
            </span>
            {upcoming.slice(0, 3).map((x) => (
              <span key={x.date + x.start_time}>
                {formatDayLong(x.date, today)} {formatTimeRange(x.start_time, x.end_time)}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/post?edit=${token}`} className="inline-flex min-h-12 items-center border-[1.5px] border-ink bg-surface px-4 text-[16px] font-bold">
              Edit details
            </Link>
            {d.isLive ? (
              <Link href={`/e/${event.slug}`} className="inline-flex min-h-12 items-center bg-ink px-4 text-[16px] font-bold text-wall">
                See it live
              </Link>
            ) : null}
          </div>
          {venue.lat == null ? (
            <p className="border-[1.5px] border-dashed border-line-strong px-3 py-2.5 text-[16px] text-ink-2">
              <b className="text-ink">Want people to find you?</b> Add the exact spot under Edit details and the listing gets a pin and Directions instead of &ldquo;ask&rdquo;.
            </p>
          ) : null}
        </div>
      </div>

      {admin && whatsappNumber(event.organiser_whatsapp ?? event.contact_phone) ? (
        <a
          href={`https://wa.me/${whatsappNumber(event.organiser_whatsapp ?? event.contact_phone)}?text=${encodeURIComponent(
            `Hi! Your flyer "${event.title}" is on ${SITE.name}. Here's your private link to edit it, see how many people viewed it, or renew: ${SITE.url}/manage/${token}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center justify-center gap-2 bg-act px-4 text-[16px] font-bold text-on-act"
        >
          <Icon name="message" size={18} /> Send the organiser this link on WhatsApp
        </a>
      ) : null}

      {event.status === "pending_payment" ? (
        <section className="flex flex-col gap-3 bg-surface p-5 shadow-e1">
          <h2 className="text-[21px] font-extrabold">Send it for review</h2>
          <ManageActions token={token} purpose="new" priceLabel={fee} isAdmin={admin} mode={mode} />
        </section>
      ) : null}

      {event.status === "live" ? (
        <section className="flex flex-col gap-3 bg-surface p-5 shadow-e1">
          <h2 className="text-[21px] font-extrabold">{d.isLive ? "Keep it up longer" : "Put it back up"}</h2>
          <p className="text-[16px] text-ink-2">
            {needsRenewalForDates
              ? `Your last date (${formatDayLong(lastDate!, today)}) is after the listing ends. Renew so it stays up until then.`
              : `Another ${weeks} weeks for ${fee}.`}
          </p>
          <ManageActions token={token} purpose="renew" priceLabel={fee} isAdmin={admin} mode={mode} />
        </section>
      ) : null}
    </div>
  );
}

function Step({ on = false, label, children }: { on?: boolean; label: string; children: React.ReactNode }) {
  return (
    <li className="relative text-[16px] leading-snug text-ink-2">
      <span className={`absolute top-1.5 -left-[23px] h-3 w-3 rounded-full ${on ? "bg-now ring-2 ring-ink" : "border-2 border-line-strong bg-wall"}`} aria-hidden />
      <b className="text-ink">{label}:</b> {children}
    </li>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-3 shadow-e1">
      <div className="text-[13px] font-bold text-muted">{label}</div>
      <div className="text-[24px] leading-tight font-extrabold">{value}</div>
    </div>
  );
}
