import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FollowButton } from "@/components/Follow";
import { listArtists } from "@/lib/data";

export const metadata: Metadata = {
  title: "Artists",
  description: "Musicians, DJs, facilitators and teachers playing and leading in Rishikesh — follow the ones you love.",
};

export default function ArtistsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-semibold text-saffron-ink">Directory</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Artists</h1>
      <p className="mt-2 mb-8 max-w-xl text-ink-2">
        Musicians, DJs, facilitators and teachers from the flyers. Follow someone and you&apos;ll hear the moment their next one goes up.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-2" />}>
        <List />
      </Suspense>
    </div>
  );
}

async function List() {
  const showDemo = process.env.NODE_ENV !== "production";
  const artists = (await listArtists()).filter((a) => showDemo || !a.is_demo);
  if (!artists.length) return <p className="rounded-2xl border border-dashed border-line p-6 text-muted">Artists appear here as flyers go up.</p>;
  const on = artists.filter((a) => a.live_count > 0);
  const rest = artists.filter((a) => a.live_count === 0);
  const Row = ({ a }: { a: (typeof artists)[number] }) => (
    <li className="flex items-center justify-between gap-3 border-b border-line py-3">
      <div className="min-w-0">
        <Link href={`/a/${a.slug}`} className="font-display text-lg font-semibold hover:underline">
          {a.name}
        </Link>
        <p className="text-sm text-muted">{a.live_count ? `${a.live_count} upcoming` : "No flyers up right now"}</p>
      </div>
      <FollowButton kind="artist" target={a.slug} label={a.name} compact />
    </li>
  );
  return (
    <div className="grid gap-10 sm:grid-cols-2">
      {on.length ? (
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">On soon</h2>
          <ul>
            {on.map((a) => (
              <Row key={a.slug} a={a} />
            ))}
          </ul>
        </section>
      ) : null}
      {rest.length ? (
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">Everyone else</h2>
          <ul>
            {rest.map((a) => (
              <Row key={a.slug} a={a} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
