import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <span className="block h-6 w-20 -rotate-3 bg-[var(--tape)]" aria-hidden />
      <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%]">This flyer has come down</h1>
      <p className="text-[17px] text-ink-2">It may have ended or been taken down, or the link is wrong.</p>
      <Link href="/" className="mt-3 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
        See what&apos;s on now
      </Link>
    </div>
  );
}
