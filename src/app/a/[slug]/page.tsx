import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FlyerGrid } from "@/components/FlyerCard";
import { FollowButton } from "@/components/Follow";
import { getArtist, getWhatsOn } from "@/lib/data";
import { instagramHandle } from "@/lib/util";

export async function generateMetadata({ params }: PageProps<"/a/[slug]">): Promise<Metadata> {
  const a = await getArtist((await params).slug);
  return a ? { title: `${a.name} in Rishikesh`, description: `Upcoming events with ${a.name} in Tapovan, Rishikesh.` } : { title: "Not found" };
}

export default function ArtistPage({ params }: PageProps<"/a/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-6xl animate-pulse rounded-2xl bg-paper-2" />}>
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
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All flyers
      </Link>
      <p className="mt-3 text-sm font-semibold text-saffron-ink">Artist · facilitator</p>
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{a.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <FollowButton kind="artist" target={a.slug} label={a.name} />
        {ig ? (
          <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="rounded-full border border-line px-3 py-1.5 text-[13px] font-bold">
            @{ig}
          </a>
        ) : null}
      </div>
      <h2 className="mt-8 mb-3 font-display text-xl font-semibold">Upcoming</h2>
      {wall.length ? (
        <div className="lg:max-w-4xl">
          <FlyerGrid items={wall} today={today} />
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-line p-6 text-muted">
          Nothing on the board right now. Follow {a.name} to get an email as soon as their next flyer goes up.
        </p>
      )}
    </div>
  );
}
