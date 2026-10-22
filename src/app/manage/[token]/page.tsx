import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ManageActions } from "@/components/ManageActions";
import { isAdmin } from "@/lib/admin";
import { getEventByToken } from "@/lib/data";
import { addDays, formatDayLong, formatTimeRange, todayIST } from "@/lib/dates";
import { payMode } from "@/lib/payments";
import { LISTING, rupees, SITE } from "@/lib/site";
import { flyerUrl, priceLabel, whatsappNumber } from "@/lib/util";

export const metadata: Metadata = { title: "Manage your flyer", robots: { index: false } };

export default function ManagePage({ params, searchParams }: PageProps<"/manage/[token]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-paper-2" />}>
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
  const expiringSoon = d.isLive && event.live_until! <= addDays(today, 5);
  const needsRenewalForDates = d.isLive && lastDate && lastDate > event.live_until!;
  const admin = await isAdmin();

  const status =
    event.status === "live" && d.isLive
      ? { tone: "bg-ganga-soft text-ganga", text: `Live on the board until ${formatDayLong(event.live_until!, today)}` }
      : event.status === "live"
        ? { tone: "bg-paper-2 text-ink-2", text: `Expired on ${formatDayLong(event.live_until!, today)}` }
        : event.status === "pending_review"
          ? { tone: "bg-saffron-soft text-saffron-ink", text: "Submitted — goes live once payment is confirmed" }
          : event.status === "pending_payment"
            ? { tone: "bg-saffron-soft text-saffron-ink", text: "Not live yet — complete payment to publish" }
            : { tone: "bg-red-100 text-red-800", text: "Taken down by moderators" };

  return (
    <div className="flex flex-col gap-6">
      {sp.paid ? (
        <div className="rounded-2xl bg-ganga p-5 text-white shadow-card">
          <p className="font-display text-2xl font-extrabold">You&apos;re pinned! 🎉</p>
          <p className="mt-1 text-white/90">Your flyer is live. We&apos;ve emailed this private page&apos;s link to {event.organiser_email} — bookmark it to edit or renew.</p>
        </div>
      ) : null}
      {sp.pending ? (
        <div className="rounded-2xl bg-saffron-soft p-5 text-saffron-ink">
          <p className="font-display text-2xl font-extrabold">Submitted ✓</p>
          <p className="mt-1">Your flyer goes live as soon as the {rupees(LISTING.pricePaise)} is received. Bookmark this page — it&apos;s your private link to edit or renew.</p>
        </div>
      ) : null}
      {sp.saved ? <p className="rounded-xl bg-ganga-soft px-4 py-3 font-semibold text-ganga">Changes saved.</p> : null}

      <div>
        <p className="text-sm font-semibold text-muted">Your listing · private page, don&apos;t share this link</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">{event.title}</h1>
        <p className={`mt-3 inline-block rounded-full px-3 py-1.5 text-sm font-bold ${status.tone}`}>{status.text}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        {event.flyer ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flyerUrl(event.flyer, "sm")!} alt="" className="w-full rounded-2xl border border-line max-sm:max-w-[180px]" />
        ) : null}
        <div className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Views" value={event.views.toLocaleString("en-IN")} />
            <Stat label="Upcoming dates" value={String(upcoming.length)} />
          </div>
          <p className="text-sm text-ink-2">
            📍 {venue.name} · {priceLabel(event)}
            <br />
            {upcoming.slice(0, 3).map((x) => (
              <span key={x.date + x.start_time}>
                {formatDayLong(x.date, today)} {formatTimeRange(x.start_time, x.end_time)}
                <br />
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-2">
            {d.isLive ? (
              <Link href={`/e/${event.slug}`} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-paper">
                View public page
              </Link>
            ) : null}
            <Link href={`/post?edit=${token}`} className="rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-bold">
              Edit details
            </Link>
          </div>
        </div>
      </div>

      {admin && whatsappNumber(event.contact_phone) ? (
        <a
          href={`https://wa.me/${whatsappNumber(event.contact_phone)}?text=${encodeURIComponent(
            `Hi! Your flyer "${event.title}" is on ${SITE.name}. Here's your private link to edit it, see how many people viewed it, or renew: ${SITE.url}/manage/${token}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-2xl bg-[#25D366] px-4 py-3 text-center font-bold text-white"
        >
          Send the organiser this edit link on WhatsApp
        </a>
      ) : null}

      {event.status === "pending_payment" ? (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-xl font-extrabold">Publish for {rupees(LISTING.pricePaise)}</h2>
          <ManageActions token={token} purpose="new" priceLabel={rupees(LISTING.pricePaise)} isAdmin={admin} mode={payMode()} />
        </section>
      ) : null}

      {event.status === "live" ? (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="font-display text-xl font-extrabold">{d.isLive ? "Keep it up longer" : "Put it back up"}</h2>
          <p className="mt-1 mb-3 text-sm text-ink-2">
            {needsRenewalForDates
              ? `Your last date (${formatDayLong(lastDate!, today)}) is after the listing ends — renew so it stays visible until then.`
              : expiringSoon
                ? "Your listing ends in a few days."
                : `Adds another ${LISTING.days / 7} weeks.`}
          </p>
          <ManageActions token={token} purpose="renew" priceLabel={rupees(LISTING.pricePaise)} isAdmin={admin} mode={payMode()} />
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3">
      <div className="text-xs font-semibold text-muted">{label}</div>
      <div className="font-display text-2xl font-extrabold">{value}</div>
    </div>
  );
}
