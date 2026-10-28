import type { Metadata } from "next";
import { Suspense } from "react";
import { Browse } from "@/components/Browse";
import { getWhatsOn } from "@/lib/data";
import { isValidDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "All flyers",
  description: "Every flyer pinned in Tapovan, Rishikesh, as one wall: filter by date, price, kind of thing and area.",
};

const WHENS = ["today", "tonight", "tomorrow", "weekend", "week", "all"];

export default function FlyersPage({ searchParams }: PageProps<"/flyers">) {
  return (
    <div className="paper-grain">
      <div className="mx-auto max-w-7xl px-4 pt-5 lg:px-12 lg:pt-8">
        <Suspense fallback={<div className="h-[70vh] animate-pulse bg-wall-2" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/flyers">["searchParams"] }) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const whenParam = one("when");
  const when = whenParam && (WHENS.includes(whenParam) || isValidDate(whenParam)) ? whenParam : "week";
  const data = await getWhatsOn({
    when,
    cat: one("cat")?.split(","),
    area: one("area"),
    price: one("price"),
    time: one("time"),
    type: one("type"),
    q: one("q"),
  });
  return <Browse today={data.today} agenda={data.agenda} wall={data.wall} pins={data.pins} when={when} />;
}
