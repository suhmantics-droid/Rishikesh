"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import { usePlan } from "./Plan";

// Three destinations that earn their place. The map is a view of What's on, not a tab of its own.
const TABS: { key: string; label: string; href: string; icon: IconName; match: RegExp }[] = [
  { key: "on", label: "What's on", href: "/", icon: "board", match: /^\/($|flyers|today|map|e\/)/ },
  { key: "places", label: "Places", href: "/venues", icon: "places", match: /^\/(venues|v\/|artists|a\/)/ },
  { key: "mine", label: "Mine", href: "/plan", icon: "mine", match: /^\/(plan|alerts|manage)/ },
];

function useActive() {
  const path = usePathname() ?? "/";
  return TABS.find((t) => t.match.test(path))?.key ?? null;
}

function PlanCount() {
  const n = usePlan().length;
  if (!n) return null;
  return (
    <span className="absolute -top-1 left-1/2 ml-2 min-w-5 rounded-full bg-now px-1.5 text-center text-[12px] leading-5 font-extrabold text-on-now">
      {n}
      <span className="sr-only"> saved</span>
    </span>
  );
}

/** Desktop: the same three destinations across the top. */
export function TopNav() {
  return <TopNavView active={useActive()} />;
}
export function TopNavView({ active }: { active: string | null }) {
  return (
    <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={active === t.key ? "page" : undefined}
          className={`flex min-h-11 items-center border-b-[3px] px-1 text-[17px] font-bold ${
            active === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Phone: a bottom tab bar, within thumb reach. */
export function TabBar() {
  return <TabBarView active={useActive()} />;
}
export function TabBarView({ active }: { active: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-wall/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md justify-around px-2 pt-1.5 pb-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`relative flex min-h-[52px] min-w-[88px] flex-col items-center justify-center gap-0.5 text-[14px] ${
              active === t.key ? "font-extrabold text-ink" : "font-bold text-muted"
            }`}
          >
            <Icon name={t.icon} size={24} filled={t.key === "mine" && active === "mine"} />
            {t.label}
            {t.key === "mine" ? <PlanCount /> : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
