import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-5xl">📌</p>
      <h1 className="mt-3 font-display text-3xl font-semibold">This flyer has blown away</h1>
      <p className="mt-2 text-ink-2">It may have ended, been taken down, or the link is wrong.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-saffron px-5 py-2.5 font-bold text-white">
        See what&apos;s on
      </Link>
    </div>
  );
}
