import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { getVenue } from "@/lib/data";
import { area, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Venue poster", robots: { index: false } };

// An A4 poster for one venue's own wall: "what's on here" → their page, which stays current as
// flyers come and go, so the printout never goes out of date.
export default function VenuePosterPage({ params }: PageProps<"/v/[slug]/poster">) {
  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <p className="no-print mb-4 text-[15px] text-muted">Print this page on A4 and put it up at the venue: the QR code always shows what&apos;s on there.</p>
      <Suspense fallback={<div className="aspect-[210/297] animate-pulse bg-wall-2" />}>
        <Poster params={params} />
      </Suspense>
    </div>
  );
}

async function Poster({ params }: { params: PageProps<"/v/[slug]/poster">["params"] }) {
  const v = await getVenue((await params).slug);
  if (!v) notFound();
  const svg = await QRCode.toString(`${SITE.url}/v/${v.slug}?utm_source=venue-poster`, {
    type: "svg",
    margin: 1,
    color: { dark: "#1b1a17", light: "#ffffff" },
  });
  return (
    <div className="flex aspect-[210/297] flex-col items-center justify-between border-4 border-ink bg-[#eae8e3] p-[8%] text-center text-[#1b1a17] ">
      <div>
        <p className="text-[2.2vmin] font-bold tracking-[0.3em] text-[#7a4e12] uppercase print:text-sm">{area(v.area).label} · Rishikesh</p>
        <p className="mt-5 text-[3vmin] font-semibold print:text-2xl">What&apos;s on at</p>
        <h1 className="text-[7.5vmin] leading-[1.02] font-extrabold [font-stretch:88%] print:text-7xl">{v.name}</h1>
        <p className="mt-3 text-[2.5vmin] print:text-xl">Scan for this week&apos;s events and classes, and follow us to hear about the next one.</p>
      </div>
      <div className="w-[52%]">
        <div className="bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-2 text-[2.6vmin] font-semibold break-all print:text-xl">
          {SITE.url.replace(/^https?:\/\//, "")}/v/{v.slug}
        </p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Logo className="scale-150" />
        <p className="mt-2 text-[2.1vmin] font-semibold print:text-lg">Every flyer in Tapovan, on one map.</p>
      </div>
    </div>
  );
}
