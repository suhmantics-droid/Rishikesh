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
      <p className="no-print mb-4 text-[15px] text-muted">Print this page (A4) and pin it on cafe and hostel noticeboards.</p>
      <div className="flex aspect-[210/297] flex-col items-center justify-between border-4 border-ink bg-[#eae8e3] p-[8%] text-center text-[#1b1a17] ">
        <div>
          <p className="text-[2.2vmin] font-bold tracking-[0.3em] text-[#7a4e12] uppercase print:text-sm">Tapovan · Laxman Jhula · Rishikesh</p>
          <h1 className="mt-4 text-[7vmin] leading-[1.02] font-extrabold [font-stretch:88%] print:text-6xl">What&apos;s on tonight?</h1>
          <p className="mt-3 text-[2.6vmin] print:text-xl">Every event flyer in town: yoga, kirtan, sound healing, live music, satsang. On one wall.</p>
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
  const svg = await QRCode.toString(`${SITE.url}/?utm_source=poster`, { type: "svg", margin: 1, color: { dark: "#1b1a17", light: "#ffffff" } });
  return (
    <div className="w-[55%]">
      <div className="bg-white p-3 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-2 text-[3vmin] font-semibold print:text-2xl">{SITE.url.replace(/^https?:\/\//, "")}</p>
    </div>
  );
}
