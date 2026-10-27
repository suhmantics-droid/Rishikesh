"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatDayLong, formatTimeRange, todayIST } from "@/lib/dates";
import { LiveBadge, WalkTime } from "./Live";
import { PushToggle } from "./PushToggle";
import { send } from "./Track";

// "My plan": flyers saved on this phone (no account), with an optional reminder an hour before.

const KEY = "pinned:plan";
const subs = new Set<() => void>();
let snap: string[] | null = null;

function read(): string[] {
  if (snap) return snap;
  try {
    snap = JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    snap = [];
  }
  return snap;
}
function write(next: string[]) {
  snap = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  subs.forEach((f) => f());
  // The header and the page can be separate bundles with their own copy of this module.
  window.dispatchEvent(new Event(KEY));
}
function subscribe(cb: () => void) {
  subs.add(cb);
  const reload = (e: Event) => {
    if (e instanceof StorageEvent && e.key !== KEY) return;
    snap = null;
    cb();
  };
  window.addEventListener("storage", reload);
  window.addEventListener(KEY, reload);
  return () => {
    subs.delete(cb);
    window.removeEventListener("storage", reload);
    window.removeEventListener(KEY, reload);
  };
}
const EMPTY: string[] = [];
export function usePlan() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

async function pushEndpoint() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration("/");
    return (await reg?.pushManager.getSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

/** Turns this phone's "starting soon" reminder on or off. Returns the session it's set for, if any. */
async function remind(slug: string, on: boolean): Promise<{ date: string; start_time: string } | null> {
  const endpoint = await pushEndpoint();
  if (!endpoint) return null;
  const res = await fetch("/api/plan/remind", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, slug, on }) }).catch(() => null);
  return res?.ok ? ((await res.json()) as { at: { date: string; start_time: string } | null }).at : null;
}

/** ☆ Add to my plan — also the flyer's public "interested" count. */
export function PlanButton({ slug, eventId, initial }: { slug: string; eventId: number; initial: number }) {
  const plan = usePlan();
  const saved = plan.includes(slug);
  const [count, setCount] = useState(initial);
  const [note, setNote] = useState<string | null>(null);

  async function toggle() {
    if (saved) {
      write(read().filter((s) => s !== slug));
      setNote(null);
      void remind(slug, false);
      return;
    }
    write([...read().filter((s) => s !== slug), slug]);
    // Count interest once per phone, however often it's saved and unsaved.
    const counted = `pinned:interested:${eventId}`;
    let first = true;
    try {
      first = localStorage.getItem(counted) !== "1";
      localStorage.setItem(counted, "1");
    } catch {}
    if (first) {
      setCount((c) => c + 1);
      send({ eventId, kind: "interested" });
    }
    const at = await remind(slug, true);
    setNote(at ? `⏰ We'll remind you before it starts (${formatDayLong(at.date).split(" · ")[0]} ${formatTimeRange(at.start_time)}).` : "Saved to your plan.");
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={saved}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
            saved ? "border-saffron bg-saffron-soft text-saffron-ink" : "border-line bg-card hover:border-ink-2"
          }`}
        >
          {saved ? "★ In my plan" : "☆ Add to my plan"}
          {count > 0 ? <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-2" title="People interested">{count}</span> : null}
        </button>
        {saved ? (
          <Link href="/plan" className="text-sm font-semibold underline">
            See my plan
          </Link>
        ) : null}
      </div>
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}

/** Header shortcut, shown once something's saved. */
export function PlanLink() {
  const n = usePlan().length;
  if (!n) return null;
  return (
    <Link href="/plan" className="rounded-full px-2 py-2 whitespace-nowrap text-ink-2 hover:bg-paper-2 sm:px-3" aria-label={`My plan, ${n} saved`}>
      ★ <span className="text-saffron-ink">{n}</span>
    </Link>
  );
}

type Item = {
  slug: string;
  title: string;
  kind: string;
  thumb: string | null;
  price: string;
  venue: string;
  lat: number | null;
  lng: number | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  label: string | null;
};

/** The saved flyers, day by day. */
export function PlanList() {
  const plan = usePlan();
  const [data, setData] = useState<{ key: string; items: Item[] } | null>(null);
  const key = plan.join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`/api/plan?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: { items: Item[]; gone: string[] }) => {
        if (cancelled) return;
        setData({ key, items: d.items });
        // Forget flyers that have come down.
        if (d.gone?.length) write(read().filter((s) => !d.gone.includes(s)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!plan.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card/60 p-8 text-center">
        <p className="font-display text-xl font-semibold">Nothing saved yet</p>
        <p className="mt-1 text-sm text-muted">Tap ☆ Add to my plan on any flyer and it lands here, day by day.</p>
        <Link href="/" className="mt-4 inline-block rounded-full bg-saffron px-4 py-2 text-sm font-bold text-white">
          Browse the flyers
        </Link>
      </div>
    );
  }
  if (!data || data.key !== key) return <div className="h-64 animate-pulse rounded-2xl bg-paper-2" />;

  const today = todayIST();
  const days = new Map<string, Item[]>();
  for (const i of data.items) days.set(i.date, [...(days.get(i.date) ?? []), i]);
  return (
    <div className="flex flex-col gap-6">
      {[...days.entries()].map(([date, list]) => (
        <section key={date}>
          <h2 className="mb-2 font-display text-lg font-semibold">{formatDayLong(date, today)}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {list.map((i) => (
              <li key={`${i.slug}-${i.date}-${i.start_time}`} className="flex items-center gap-3 p-3">
                <Link href={`/e/${i.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="w-16 shrink-0 text-right font-display text-[15px] font-semibold">{formatTimeRange(i.start_time) || "—"}</span>
                  {i.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.thumb} alt="" loading="lazy" className="h-14 w-11 shrink-0 rounded-md object-cover object-top" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{i.label ?? i.title}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {i.label ? `${i.title} · ` : ""}
                      {i.venue}
                      {i.price ? ` · ${i.price}` : ""}
                    </span>
                    <WalkTime lat={i.lat} lng={i.lng} className="text-[12px] font-semibold text-ganga" />
                  </span>
                  <LiveBadge date={i.date} start={i.start_time} end={i.end_time} />
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${i.title} from my plan`}
                  className="shrink-0 px-1 text-muted hover:text-ink"
                  onClick={() => {
                    write(read().filter((s) => s !== i.slug));
                    void remind(i.slug, false);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-sm font-bold">Get a reminder before each one</p>
        <p className="mb-3 text-sm text-muted">Turn on notifications, then add flyers to your plan — we&apos;ll nudge you about an hour before they start.</p>
        <PushToggle compact />
      </div>
    </div>
  );
}
