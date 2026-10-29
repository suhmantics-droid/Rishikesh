import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlyerGrid } from "@/components/FlyerCard";
import { FollowButton } from "@/components/Follow";
import { Icon } from "@/components/Icon";
import { getArtist, getWhatsOn } from "@/lib/data";
import { instagramHandle } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const a = await getArtist((await params).slug);
  return a ? { title: `${a.name} in Rishikesh`, description: `Upcoming events with ${a.name} in Tapovan, Rishikesh.` } : { title: "Not found" };
}

export default function ArtistPage({ params }: PageProps<"/a/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse bg-wall-2" />}>
      <ArtistView params={params} />
    </Suspense>
  );
}

async function ArtistView({ params }: { params: PageProps<"/a/[slug]">["params"] }) {
  const a = await getArtist((await params).slug);
  if (!a) notFound();
  const { wall, today } = await getWhatsOn({ when: "all", artist: a.slug });
  const ig = instagramHandle(a.instagram);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 pb-8 lg:px-12 lg:pt-6">
      <Link href="/artists" className="inline-flex min-h-11 items-center gap-1 text-[16px] font-bold text-ink-2 hover:text-ink">
        <Icon name="back" size={18} /> Musicians
      </Link>
      <span className="mt-2 block text-[13px] font-extrabold tracking-[0.08em] text-muted uppercase">Artist or facilitator</span>
      <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">{a.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FollowButton kind="artist" target={a.slug} label={a.name} compact />
        {ig ? (
          <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-[1.5px] border-ink px-4 text-[15px] font-semibold">
            <Icon name="external" size={16} /> @{ig}
          </a>
        ) : null}
      </div>
      <h2 className="mt-8 mb-3 text-[21px] font-extrabold lg:text-[24px]">On the wall</h2>
      {wall.length ? (
        <div className="lg:max-w-4xl">
          <FlyerGrid items={wall} today={today} cols="columns-2 sm:columns-3" />
        </div>
      ) : (
        <div className="flex flex-col gap-1 border-[1.5px] border-dashed border-line-strong px-4 py-4">
          <span className="text-[17px] font-bold">No flyers up right now</span>
          <span className="text-[16px] text-ink-2">Follow {a.name} to hear when their next one goes up.</span>
        </div>
      )}
    </div>
  );
}
