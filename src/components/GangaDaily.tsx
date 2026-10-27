import { connection } from "next/server";
import { getPhoto, PHOTO_SLOTS } from "@/lib/photos";
import { SitePhoto } from "./SitePhoto";

const PLACES = [
  { name: "Parmarth Niketan", where: "Swarg Ashram, near Ram Jhula", q: "Parmarth Niketan Ganga Aarti Rishikesh" },
  { name: "Triveni Ghat", where: "Rishikesh town", q: "Triveni Ghat Rishikesh" },
];

/** The one event that never needs a flyer: the evening Ganga Aarti. */
export async function GangaDaily({ className = "" }: { className?: string }) {
  await connection();
  const photo = await getPhoto("aarti");
  return (
    <section className={`grid overflow-hidden rounded-2xl border border-ganga/30 bg-ganga-soft sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] ${className}`}>
      <SitePhoto photo={photo} want={PHOTO_SLOTS.find((s) => s.key === "aarti")!.want} className="h-44 sm:h-full sm:min-h-52" sizes="(min-width: 640px) 40vw, 100vw" />
      <div className="flex flex-col gap-3 p-5">
        <div>
          <p className="text-xs font-bold tracking-wide text-ganga uppercase">Every evening on the Ganga</p>
          <h2 className="font-display text-2xl font-semibold tracking-tight">Ganga Aarti at sunset</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-2">
            Fire, bells and chanting on the river steps — free, every day. Around sunset (roughly 5:30–7pm depending on the season); arrive 30
            minutes early for a spot on the ghat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLACES.map((p) => (
            <a
              key={p.name}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-ganga px-4 py-2.5 text-sm font-bold text-on-ganga"
            >
              {p.name} ↗<span className="block text-xs font-normal opacity-85">{p.where}</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
