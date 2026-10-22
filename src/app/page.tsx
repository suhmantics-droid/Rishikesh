import Link from "next/link";
import { Suspense } from "react";
import { Browse } from "@/components/Browse";
import { getWhatsOn } from "@/lib/data";
import { isValidDate } from "@/lib/dates";
import { LISTING, rupees } from "@/lib/site";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-7xl px-4">
        <section className="pt-5 pb-2 sm:pt-10 sm:pb-3">
          <p className="text-sm font-semibold text-saffron-ink">Tapovan · Laxman Jhula · Rishikesh</p>
          <h1 className="mt-1 max-w-3xl font-display text-[28px] leading-[1.08] font-extrabold tracking-tight sm:text-5xl">
            What&apos;s on in Tapovan — find out <span className="text-saffron">before</span> it&apos;s over.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-2 sm:mt-3 sm:text-base">
            Live music, ecstatic dance, sound healing, kirtan, cacao, workshops — the flyers from every cafe wall and WhatsApp group, on one map.
          </p>
        </section>
        <Suspense fallback={<BrowseSkeleton />}>
          <Results searchParams={searchParams} />
        </Suspense>
        <section className="my-10 grid gap-3 sm:grid-cols-2">
          <Link href="/alerts" className="rounded-2xl border border-line bg-card p-5 shadow-card hover:border-ink-2">
            <p className="font-display text-lg font-bold">🔔 Never miss your favourite musician</p>
            <p className="mt-1 text-sm text-muted">Follow artists, cafes or a vibe (say, ecstatic dance) and get an email the moment a new flyer goes up.</p>
          </Link>
          <Link href="/post" className="rounded-2xl border border-line bg-card p-5 shadow-card hover:border-ink-2">
            <p className="font-display text-lg font-bold">📸 Running an event? Snap your flyer.</p>
            <p className="mt-1 text-sm text-muted">
              We read the date, time and price for you. {rupees(LISTING.pricePaise)} keeps it on the map for {LISTING.days / 7} weeks.
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
