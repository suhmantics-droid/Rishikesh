import Link from "next/link";
import { Icon } from "./Icon";

const CHIPS = [
  { key: "now", label: "Now", href: "/" },
  { key: "tonight", label: "Tonight", href: "/flyers?when=tonight" },
  { key: "tomorrow", label: "Tomorrow", href: "/flyers?when=tomorrow" },
  { key: "weekend", label: "Weekend", href: "/flyers?when=weekend" },
] as const;

/** One row of When, plus the Practice shortcut and the map. Kept to one line so the wall starts high. */
export function WhenBar({ active }: { active: string | null }) {
  const chip = "flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] px-4 text-[16px] font-semibold whitespace-nowrap";
  return (
    <nav aria-label="When" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-3 pb-4 lg:mx-0 lg:px-0">
      {CHIPS.map((c) => (
        <Link
          key={c.key}
          href={c.href}
          aria-current={active === c.key ? "page" : undefined}
          className={`${chip} ${active === c.key ? "border-ink bg-ink text-wall" : "border-ink hover:bg-wall-2"}`}
        >
          {c.label}
        </Link>
      ))}
      <Link
        href="/flyers?cat=practice"
        aria-current={active === "practice" ? "page" : undefined}
        className={`${chip} font-bold ${active === "practice" ? "border-sandal bg-sandal text-wall" : "border-sandal text-sandal hover:bg-wall-2"}`}
      >
        Practice
      </Link>
      <Link href="/map" className={`${chip} border-ink hover:bg-wall-2`}>
        <Icon name="map" size={18} /> Map
      </Link>
    </nav>
  );
}
