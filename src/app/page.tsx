import Link from "next/link";
import { Suspense } from "react";
import { Browse } from "@/components/Browse";
import { connection } from "next/server";
import { GangaDaily } from "@/components/GangaDaily";
import { SitePhoto } from "@/components/SitePhoto";
import { getPhoto, PHOTO_SLOTS } from "@/lib/photos";
import { getWhatsOn } from "@/lib/data";
import { isValidDate } from "@/lib/dates";
import { LISTING, rupees } from "@/lib/site";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="paper-grain">
      <section className="relative isolate overflow-hidden">
        <Suspense fallback={<SitePhoto photo={null} want="" className="absolute inset-0 -z-10" />}>
          <HeroPhoto />
        </Suspense>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 via-black/30 to-black/5" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-6 text-white sm:pt-36 sm:pb-10">
          <p className="text-sm font-semibold text-white/90">Tapovan · Laxman Jhula · Rishikesh</p>
          <h1 className="mt-1 max-w-3xl font-display text-[30px] leading-[1.06] font-semibold tracking-tight drop-shadow-sm sm:text-5xl">
            What&apos;s on in Tapovan — find out <em className="font-medium text-[#ffc59c] italic">before</em> it&apos;s over.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90 sm:mt-3 sm:text-base">
            Live music, ecstatic dance, sound healing, kirtan, cacao, workshops — the flyers from every cafe wall and WhatsApp group, on one map.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4">
        <Suspense fallback={<BrowseSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={null}>
          <GangaDaily className="mt-10" />
        </Suspense>
        <nav className="mt-6 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Browse">
          <Link href="/venues" className="rounded-full border border-line bg-card px-4 py-2 hover:border-ganga/60">
            All venues →
          </Link>
          <Link href="/artists" className="rounded-full border border-line bg-card px-4 py-2 hover:border-ganga/60">
            All artists →
          </Link>
          <Link href="/today" className="rounded-full border border-line bg-card px-4 py-2 hover:border-ganga/60">
            Today&apos;s list →
          </Link>
        </nav>
        <section className="my-6 grid gap-3 sm:grid-cols-2">
          <Link href="/alerts" className="rounded-2xl border border-line bg-card p-5 shadow-card hover:border-ink-2">
            <p className="font-display text-lg font-semibold">🔔 Never miss your favourite musician</p>
            <p className="mt-1 text-sm text-muted">Follow artists, cafes or a vibe (say, ecstatic dance) and get a phone notification the moment a new flyer goes up.</p>
          </Link>
          <Link href="/post" className="rounded-2xl border border-line bg-card p-5 shadow-card hover:border-ink-2">
            <p className="font-display text-lg font-semibold">📸 Running an event? Snap your flyer.</p>
            <p className="mt-1 text-sm text-muted">
              Snap it, check the details, done. {rupees(LISTING.pricePaise)} keeps it on the map for {LISTING.days / 7} weeks.
            </p>
          </Link>
        </section>
      </div>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const whenParam = one("when");
  const when = whenParam && (["today", "tomorrow", "weekend", "week", "all"].includes(whenParam) || isValidDate(whenParam)) ? whenParam : "week";
  const data = await getWhatsOn({
    when,
    cat: one("cat")?.split(","),
    area: one("area"),
    price: one("price"),
    time: one("time"),
    q: one("q"),
  });
  return <Browse today={data.today} agenda={data.agenda} wall={data.wall} pins={data.pins} when={when} />;
}

function BrowseSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex gap-2 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-paper-2" />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/6] rounded-2xl bg-paper-2" />
        ))}
      </div>
    </div>
  );
}

async function HeroPhoto() {
  await connection();
  const want = PHOTO_SLOTS.find((s) => s.key === "hero")!.want;
  const photo = await getPhoto("hero");
  return (
    <>
      <SitePhoto photo={photo} want={want} className="absolute inset-0 -z-10" priority showCredit={false} />
      {photo?.credit ? <span className="absolute right-3 bottom-2 text-[10px] text-white/75">📷 {photo.credit}</span> : null}
    </>
  );
}
