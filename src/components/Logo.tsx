import { SITE } from "@/lib/site";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <circle cx="12" cy="8" r="6" fill="var(--saffron)" />
        <circle cx="10" cy="6.2" r="1.8" fill="#fff" opacity=".55" />
        <path d="M12 14v8" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">{SITE.name}</span>
      <span className="hidden text-sm font-medium text-muted sm:inline">{SITE.place}</span>
    </span>
  );
}
