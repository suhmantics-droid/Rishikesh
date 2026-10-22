"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Shown if a page fails to render. Keeps the header/footer and offers a way back. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-ink-2">That page didn&apos;t load. It&apos;s usually a blip — try again.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => retry()} className="rounded-full bg-ganga px-5 py-2.5 font-bold text-on-ganga">
          Try again
        </button>
        <Link href="/" className="rounded-full border border-line px-5 py-2.5 font-bold">
          See what&apos;s on
        </Link>
      </div>
    </div>
  );
}
