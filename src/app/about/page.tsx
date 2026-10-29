import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ownerContact } from "@/lib/payments";
import { LISTING, rupees, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "How it works", description: `How ${SITE.name} works, for visitors and for organisers.` };

const price = rupees(LISTING.pricePaise);
const weeks = LISTING.days / 7;

const VISITORS: [IconName, string, string][] = [
  ["board", "Now, tonight, this week", "What's on right now and next, as flyers or as a list by the hour."],
  ["map", "The map", "Every place with something on, with walking directions. Approximate spots say so."],
  ["follow", "Follow", "A teacher, a cafe or a kind of practice. You hear when their next flyer goes up."],
  ["message", "Share", "Send any flyer, or the whole day, to your WhatsApp group."],
];

export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-6 pb-10 lg:pt-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-[34px] leading-[1.05] font-extrabold [font-stretch:88%] lg:text-[44px]">Every flyer in Tapovan, on one wall.</h1>
        <p className="text-[18px] leading-relaxed text-ink-2">
          In Tapovan the best things are announced on paper: a kirtan by the river, a sound bath at sunset, a jam on a rooftop, a satsang up the hill.
          They go up on cafe noticeboards and in forwarded WhatsApp images. Unless you walked past the right wall, you hear about it the day after.
        </p>
        <p className="text-[18px] leading-relaxed text-ink-2">{SITE.name} puts those flyers on one wall you can look through by time, place, price and kind of practice.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-[24px] font-extrabold">For visitors</h2>
        <ul className="flex flex-col gap-2">
          {VISITORS.map(([icon, title, text]) => (
            <li key={title} className="flex gap-3 bg-surface p-4 shadow-e1">
              <Icon name={icon} size={22} className="mt-0.5" />
              <span className="flex flex-col">
                <b className="text-[17px]">{title}</b>
                <span className="text-[16px] text-ink-2">{text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[16px] text-ink-2">Free for visitors. No account and no app to install. Add it to your home screen if you like.</p>
      </section>

      <section id="organisers" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="text-[24px] font-extrabold">For organisers, cafes and teachers</h2>
        <div className="flex flex-col gap-3 bg-surface p-5 shadow-e1">
          <p className="text-[30px] leading-tight font-extrabold">
            {price} <span className="text-[18px] font-semibold text-ink-2">for {weeks} weeks on the wall</span>
          </p>
          <ul className="flex flex-col gap-2 text-[16px] text-ink-2">
            {[
              "Anyone who advertises pays the same. No account needed.",
              "A person checks it the same day and messages you on WhatsApp. You pay only after it's checked.",
              "Your flyer on the wall, the list and the map. Weekly classes show on every day they run.",
              "People following your venue, your teachers or your kind of event hear when it goes up.",
              "Edit any time and see how many people viewed it. Nothing renews by itself.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Icon name="check" size={20} className="mt-0.5 text-act-ink" /> {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link href="/post" className="inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
              Post a flyer
            </Link>
            <Suspense fallback={null}>
              <OwnerWhatsApp />
            </Suspense>
          </div>
        </div>
        <p className="text-[15px] text-muted">{SITE.name} checks that the date, time and place match the flyer. It lists events; it doesn&apos;t vet or recommend them.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[24px] font-extrabold">Questions</h2>
        <dl className="flex flex-col gap-4 text-[16px] text-ink-2">
          <div>
            <dt className="text-[17px] font-bold text-ink">Which areas do you cover?</dt>
            <dd>Upper and Lower Tapovan and Laxman Jhula, with Ram Jhula and Swarg Ashram nearby.</dd>
          </div>
          <div>
            <dt className="text-[17px] font-bold text-ink">Something&apos;s wrong or cancelled</dt>
            <dd>Use &ldquo;Report this flyer&rdquo; at the bottom of any listing and we&apos;ll fix it or take it down.</dd>
          </div>
          <div>
            <dt className="text-[17px] font-bold text-ink">Can cafes put a poster up?</dt>
            <dd>
              Yes please. Print the{" "}
              <Link href="/poster" className="font-bold text-act-ink underline">
                QR poster
              </Link>{" "}
              for your noticeboard so travellers can find everything else that&apos;s on.
            </dd>
          </div>
          <div>
            <dt className="text-[17px] font-bold text-ink">What does Recommended mean?</dt>
            <dd>Places we send friends to. It&apos;s our own pick and it&apos;s never paid for.</dd>
          </div>
        </dl>
      </section>
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
      className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink px-5 text-[16px] font-bold"
    >
      <Icon name="message" size={18} /> WhatsApp {name ?? "us"} your flyer
    </a>
  );
}
