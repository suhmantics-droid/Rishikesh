import { SITE } from "@/lib/site";

/** The wordmark. The brand picture (an illustrated map of Tapovan) lives in the app icon and share images. */
export function Logo({ className = "" }: { className?: string }) {
  return <span className={`text-[24px] leading-none font-extrabold tracking-tight [font-stretch:85%] lg:text-[26px] ${className}`}>{SITE.name}</span>;
}
