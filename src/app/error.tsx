"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown if a page fails to render. Keeps the header/footer and offers a way back. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">Something went wrong</h1>
      <p className="mt-2 text-[17px] text-ink-2">That page didn&apos;t load. It&apos;s usually a blip, so try again.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => retry()} className="inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
          Try again
        </button>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-full border-[1.5px] border-ink px-5 text-[16px] font-bold">
          See what&apos;s on
        </Link>
      </div>
    </div>
  );
}
