import type { Metadata } from "next";
import { connection } from "next/server";
import QRCode from "qrcode";
import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Cafe poster", robots: { index: false } };

// A4 poster for cafe noticeboards: the physical flyer wall points to the digital one.
export default function PosterPage() {
  return (
    <div className="mx-auto max-w-[210mm] px-4 py-6 print:p-0">
      <p className="no-print mb-4 text-sm text-muted">Print this page (A4) and pin it on cafe and hostel noticeboards.</p>
      <div className="flex aspect-[210/297] flex-col items-center justify-between rounded-3xl border-4 border-ink bg-[#f6f1e7] p-[8%] text-center text-[#1d1b16] print:rounded-none">
        <div>
          <p className="text-[2.2vmin] font-bold tracking-[0.3em] text-[#b4441a] uppercase print:text-sm">Tapovan · Laxman Jhula · Rishikesh</p>
          <h1 className="mt-4 font-display text-[7vmin] leading-[1.02] font-semibold tracking-tight print:text-6xl">What&apos;s on tonight?</h1>
          <p className="mt-3 text-[2.6vmin] print:text-xl">Every event flyer in town — music, dance, sound healing, kirtan, workshops — on one map.</p>
        </div>
        <Suspense fallback={<div className="aspect-square w-[55%] bg-white" />}>
          <Qr />
        </Suspense>
        <div className="flex flex-col items-center gap-2">
          <Logo className="scale-150" />
          <p className="mt-2 text-[2.2vmin] font-semibold print:text-lg">Running an event? Post your flyer at the same link.</p>
        </div>
      </div>
    </div>
  );
}

async function Qr() {
  await connection();
  const svg = await QRCode.toString(`${SITE.url}/?utm_source=poster`, { type: "svg", margin: 1, color: { dark: "#1d1b16", light: "#ffffff" } });
  return (
    <div className="w-[55%]">
      <div className="rounded-2xl bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 font-display text-[3vmin] font-semibold print:text-2xl">{SITE.url.replace(/^https?:\/\//, "")}</p>
    </div>
  );
}
