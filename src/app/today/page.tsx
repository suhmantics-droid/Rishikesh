import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Agenda } from "@/components/Agenda";
import { GangaDaily } from "@/components/GangaDaily";
import { getWhatsOn } from "@/lib/data";
import { formatDate, todayIST } from "@/lib/dates";

// A single shareable "what's on today" page — made to be pasted into WhatsApp groups.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const today = todayIST();
  return {
    title: `Today in Tapovan · ${formatDate(today)}`,
    description: "Everything on today in Tapovan and Laxman Jhula: live music, dance, sound healing, kirtan and more.",
    openGraph: { images: [{ url: `/today/og?d=${today}`, width: 1200, height: 630 }] },
  };
}

export default function TodayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-2" />}>
        <Today />
      </Suspense>
    </div>
  );
}

async function Today() {
  const { agenda, today } = await getWhatsOn({ when: "today" });
  const events = new Set(agenda.filter((e) => e.kind !== "classes").map((e) => e.id)).size;
  const classes = agenda.filter((e) => e.kind === "classes").length;
  return (
    <>
      <p className="text-sm font-semibold text-saffron-ink">{formatDate(today)}</p>
      <h1 className="font-display text-4xl font-semibold tracking-tight">Today in Tapovan</h1>
      <p className="mt-2 mb-6 text-ink-2">
        {agenda.length
          ? [events ? `${events} event${events === 1 ? "" : "s"}` : "", classes ? `${classes} drop-in class${classes === 1 ? "" : "es"}` : ""].filter(Boolean).join(" and ") + " today."
          : "Nothing pinned for today yet."}{" "}
        <Link href="/?view=map&when=today" className="font-semibold underline">
          See them on the map
        </Link>
      </p>
      {agenda.length ? <Agenda items={agenda} today={today} dayHeaders={false} classesOpen /> : null}
      <GangaDaily className="mt-8" />
      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/?when=tomorrow" className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          Tomorrow →
        </Link>
        <Link href="/?when=weekend" className="rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          This weekend →
        </Link>
        <Link href="/alerts" className="rounded-full bg-saffron px-4 py-2 text-sm font-bold text-white">
          Get daily alerts
        </Link>
      </div>
    </>
  );
}
