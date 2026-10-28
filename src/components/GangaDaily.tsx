import { connection } from "next/server";
import { getPhoto, PHOTO_SLOTS } from "@/lib/photos";
import { SitePhoto } from "./SitePhoto";

const PLACES = [
  { name: "Parmarth Niketan", where: "Swarg Ashram, near Ram Jhula", q: "Parmarth Niketan Ganga Aarti Rishikesh" },
  { name: "Triveni Ghat", where: "Rishikesh town", q: "Triveni Ghat Rishikesh" },
];

/** The one event that never needs a flyer: the evening Ganga Aarti. The only dark band on the wall. */
export async function GangaDaily({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  await connection();
  const photo = await getPhoto("aarti");
  return (
    <section
      aria-label="Ganga Aarti, every evening"
      className={`grid overflow-hidden bg-dusk text-dusk-ink ${compact ? "grid-cols-[96px_1fr]" : "grid-cols-[110px_1fr] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"} ${className}`}
    >
      <SitePhoto photo={photo} want={PHOTO_SLOTS.find((s) => s.key === "aarti")!.want} className="h-full min-h-32" sizes="(min-width: 640px) 40vw, 120px" showCredit={false} />
      <div className="flex flex-col gap-2 p-4 sm:p-5">
        <span lang="hi" className="hi !text-now">
          गंगा आरती
        </span>
        <h2 className="text-[20px] leading-tight font-extrabold sm:text-[24px]">Ganga Aarti, around sunset</h2>
        <p className="text-[16px] leading-snug text-dusk-muted">
          Fire, bells and chanting on the river steps. Free, every evening, roughly 5:30–7pm depending on the season. Arrive 30 minutes early for a
          spot on the ghat.
        </p>
        {compact ? null : (
          <div className="mt-1 flex flex-wrap gap-2">
            {PLACES.map((p) => (
              <a
                key={p.name}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.q)}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 flex-col justify-center border-[1.5px] border-dusk-muted px-3 py-1.5 text-[16px] font-bold hover:bg-dusk-ink hover:text-dusk"
              >
                {p.name}
                <span className="text-[14px] font-medium opacity-85">{p.where}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
