import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowButton } from "@/components/Follow";
import { Icon } from "@/components/Icon";
import { listArtists } from "@/lib/data";

export const metadata: Metadata = {
  title: "Musicians",
  description: "Musicians, kirtan singers and DJs playing in Tapovan. Follow the ones you love to hear when they play next.",
};

export default function ArtistsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-3 pb-8 lg:px-12 lg:pt-6">
      <Link href="/venues" className="inline-flex min-h-11 items-center gap-1 text-[16px] font-bold text-ink-2 hover:text-ink">
        <Icon name="back" size={18} /> Places
      </Link>
      <h1 className="mt-1 text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">Musicians</h1>
      <p className="mt-1 mb-6 max-w-xl text-[16px] text-ink-2">
        Musicians, kirtan singers and DJs from the flyers. Follow someone to hear when they play next.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse bg-wall-2" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const showDemo = process.env.NODE_ENV !== "production";
  const artists = (await listArtists()).filter((a) => showDemo || !a.is_demo);
  if (!artists.length)
    return <p className="border-[1.5px] border-dashed border-line-strong px-4 py-4 text-[16px] text-ink-2">Musicians appear here as their gig flyers go up.</p>;
  const on = artists.filter((a) => a.live_count > 0);
  const rest = artists.filter((a) => a.live_count === 0);
  const Row = ({ a }: { a: (typeof artists)[number] }) => (
    <li className="flex items-center justify-between gap-3 bg-surface px-4 py-2.5 shadow-e1">
      <Link href={`/a/${a.slug}`} className="flex min-h-11 min-w-0 flex-col justify-center">
        <span className="text-[17px] font-bold">{a.name}</span>
        <span className={`text-[15px] ${a.live_count ? "font-bold text-act-ink" : "text-muted"}`}>
          {a.live_count ? `${a.live_count} flyer${a.live_count === 1 ? "" : "s"} up` : "No flyers up right now"}
        </span>
      </Link>
      <FollowButton kind="artist" target={a.slug} label={a.name} compact />
    </li>
  );
  return (
    <div className="grid gap-9 sm:grid-cols-2 sm:gap-6">
      {[
        ["On soon", on],
        ["Everyone else", rest],
      ].map(([title, list]) =>
        (list as typeof artists).length ? (
          <section key={title as string} className="flex flex-col gap-2">
            <h2 className="text-[21px] font-extrabold">{title as string}</h2>
            <ul className="flex flex-col gap-2">
              {(list as typeof artists).map((a) => (
                <Row key={a.slug} a={a} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
