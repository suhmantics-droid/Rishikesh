import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ownerContact } from "@/lib/payments";
import { LISTING, rupees, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "How it works", description: `How ${SITE.name} ${SITE.place} works, for visitors and event organisers.` };

const price = rupees(LISTING.pricePaise);
const weeks = LISTING.days / 7;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Every flyer in Tapovan, in one place.</h1>
      <p className="mt-4 text-lg text-ink-2">
        In Rishikesh the best things — a kirtan by the river, a jam on a rooftop, an ecstatic dance up the hill — are announced on paper flyers, cafe
        noticeboards and forwarded WhatsApp images. Unless you walked past the right wall, you usually hear about it the day after.
      </p>
      <p className="mt-3 text-lg text-ink-2">{SITE.name} puts those flyers on one map you can filter by date, price, area and vibe.</p>

      <h2 className="mt-10 font-display text-2xl font-semibold">For visitors</h2>
      <ul className="mt-3 grid gap-2 text-ink-2">
        <li>📅 <b>Today, tomorrow, this weekend</b> — see what&apos;s on, as flyers or as a day-by-day agenda.</li>
        <li>🗺️ <b>Map</b> — pins for every venue with something on, and walking directions.</li>
        <li>🔔 <b>Alerts</b> — follow a musician, a cafe or a vibe and get an email when their next flyer goes up.</li>
        <li>💬 <b>Share</b> — send any flyer, or the whole day&apos;s list, to your WhatsApp group.</li>
        <li>Free for visitors. No account, no app to install — add it to your home screen if you like.</li>
      </ul>

      <h2 id="organisers" className="mt-10 scroll-mt-20 font-display text-2xl font-semibold">
        For organisers, cafes & artists
      </h2>
      <div className="mt-3 rounded-2xl border border-line bg-card p-5">
        <p className="font-display text-3xl font-semibold">
          {price} <span className="text-lg font-semibold text-muted">for {weeks} weeks on the map</span>
        </p>
        <ul className="mt-3 grid gap-1.5 text-ink-2">
          <li>✓ Your flyer on the wall, the agenda and the map</li>
          <li>✓ Recurring events (every Saturday kirtan, weekly jam) show on every date</li>
          <li>✓ An instant email to everyone following your venue, your artists or your kind of event</li>
          <li>✓ Edit any time, see how many people viewed it, renew in one tap</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/post" className="rounded-xl bg-saffron px-4 py-2.5 font-bold text-white">
            Post a flyer
          </Link>
          <Suspense fallback={null}>
            <OwnerWhatsApp />
          </Suspense>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        Snap your flyer, add the date, time and place, and submit. For now payment is in cash; we publish as soon
        as it&apos;s received.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">Questions</h2>
      <dl className="mt-3 grid gap-4 text-ink-2">
        <div>
          <dt className="font-bold text-ink">Which areas do you cover?</dt>
          <dd>Upper and Lower Tapovan, Laxman Jhula and Ram Jhula / Swarg Ashram to start, then the rest of Rishikesh.</dd>
        </div>
        <div>
          <dt className="font-bold text-ink">Something&apos;s wrong or cancelled</dt>
          <dd>Use &ldquo;Report this flyer&rdquo; at the bottom of any listing and we&apos;ll fix or remove it.</dd>
        </div>
        <div>
          <dt className="font-bold text-ink">Can cafes put a poster up?</dt>
          <dd>
            Yes please — print the <Link href="/poster" className="underline">QR poster</Link> for your noticeboard so travellers can find everything else
            that&apos;s on.
          </dd>
        </div>
      </dl>
    </div>
  );
}

async function OwnerWhatsApp() {
  await connection();
  const { whatsapp, name } = await ownerContact();
  if (!whatsapp) return null;
  return (
    <a
      href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! I'd like to put my event on ${SITE.name}.`)}`}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border border-line px-4 py-2.5 font-bold"
    >
      WhatsApp {name ?? "us"} your flyer
    </a>
  );
}
