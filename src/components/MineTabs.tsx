import Link from "next/link";

const TABS = [
  { key: "plan", label: "Plan", href: "/plan" },
  { key: "following", label: "Following", href: "/alerts" },
  { key: "flyers", label: "My flyers", href: "/manage" },
] as const;

/** Mine is one place in three parts: what I'm going to, what I follow, what I've posted. All on this phone. */
export function MineHeader({ active, children }: { active: (typeof TABS)[number]["key"]; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-[30px] leading-tight font-extrabold [font-stretch:88%] lg:text-[40px]">Mine</h1>
      <nav aria-label="Mine" className="flex self-start overflow-hidden rounded-full border-[1.5px] border-ink">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`flex min-h-11 items-center px-4 text-[16px] font-semibold whitespace-nowrap ${active === t.key ? "bg-ink text-wall" : "hover:bg-wall-2"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children ? <p className="max-w-xl text-[16px] text-ink-2">{children}</p> : null}
    </div>
  );
}
