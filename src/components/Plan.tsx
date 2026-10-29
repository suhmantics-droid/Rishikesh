"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { formatDayLong, formatTimeRange, todayIST } from "@/lib/dates";
import { Icon } from "./Icon";
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
  // Keep their calendar subscription (if they set one up) in step with the plan.
  const token = calendarToken();
  if (token) void saveCalendar(token, next);
}

const noSubscription = () => () => {};

// "My calendar": a private link to the plan that a calendar app subscribes to. The token lives on this phone.
const CAL_KEY = "pinned:calendar";
function calendarToken() {
  try {
    return localStorage.getItem(CAL_KEY);
  } catch {
    return null;
  }
}
async function saveCalendar(token: string | null, slugs: string[]) {
  const res = await fetch("/api/plan/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, slugs }) }).catch(() => null);
  const d = (await res?.json().catch(() => null)) as { token?: string } | null;
  if (d?.token) {
    try {
      localStorage.setItem(CAL_KEY, d.token);
    } catch {}
  }
  return d?.token ?? null;
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

/** Save to my plan, which is also the flyer's public "interested" count. */
export function PlanButton({ slug, eventId, initial, compact = false }: { slug: string; eventId: number; initial: number; compact?: boolean }) {
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
    setNote(at ? `We'll remind you before it starts (${formatDayLong(at.date).split(" · ")[0]} ${formatTimeRange(at.start_time)}).` : "Saved to your plan.");
  }

  if (compact)
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={`inline-flex min-h-12 items-center justify-center gap-1.5 border-[1.5px] px-3 text-[16px] font-bold ${saved ? "border-ink bg-ink text-wall" : "border-ink bg-surface"}`}
      >
        <Icon name="save" filled={saved} size={18} />
        {saved ? "Saved" : "Save"}
      </button>
    );

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={`inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full px-5 text-[17px] font-bold transition ${
          saved ? "bg-ink text-wall" : "bg-act text-on-act hover:brightness-110"
        }`}
      >
        <Icon name="save" filled={saved} />
        {saved ? "Saved to my plan" : "Save to my plan"}
        {count > 0 ? <span className="text-[15px] font-semibold opacity-85">· {count} interested</span> : null}
      </button>
      {note || saved ? (
        <p className="text-[15px] text-ink-2">
          {note ?? "In your plan."}{" "}
          <Link href="/plan" className="font-bold underline">
            See my plan
          </Link>
        </p>
      ) : null}
    </div>
  );
}

/** Header shortcut, shown once something's saved. */
export function PlanLink() {
  const n = usePlan().length;
  if (!n) return null;
  return (
    <Link href="/plan" className="rounded-full px-2 py-2 whitespace-nowrap text-ink-2 hover:bg-paper-2 sm:px-3" aria-label={`My plan, ${n} saved`}>
      <Icon name="save" size={18} /> <span>{n}</span>
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
      <div className="flex flex-col items-start gap-2 border-[1.5px] border-dashed border-line-strong px-4 py-4">
        <span className="text-[17px] font-bold">Nothing saved yet</span>
        <span className="text-[16px] text-ink-2">Tap Save on any flyer and it lands here, day by day.</span>
        <Link href="/" className="mt-1 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
          Go to the wall
        </Link>
      </div>
    );
  }
  if (!data || data.key !== key) return <div className="h-64 animate-pulse bg-wall-2" />;

  const today = todayIST();
  const days = new Map<string, Item[]>();
  for (const i of data.items) days.set(i.date, [...(days.get(i.date) ?? []), i]);
  return (
    <div className="flex flex-col gap-7">
      {[...days.entries()].map(([date, list]) => (
        <section key={date} className="flex flex-col gap-2">
          <h2 className="text-[19px] font-extrabold">{formatDayLong(date, today)}</h2>
          <ul className="flex flex-col gap-2">
            {list.map((i) => (
              <li key={`${i.slug}-${i.date}-${i.start_time}`} className="flex items-stretch bg-surface shadow-e1">
                <Link href={`/e/${i.slug}`} className="grid min-w-0 flex-1 grid-cols-[76px_1fr] items-start gap-3 px-3 py-2.5 hover:bg-slip">
                  <span className="flex flex-col items-start gap-1">
                    <span className="slip-time text-[17px]">{formatTimeRange(i.start_time) || "Time n/a"}</span>
                    <LiveBadge date={i.date} start={i.start_time} end={i.end_time} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="slip-name">{i.label ?? i.title}</span>
                    <span className="text-[15px] leading-snug text-ink-2">
                      {i.label ? `${i.title} · ` : ""}
                      {i.venue}
                      {i.price ? ` · ${i.price}` : ""}
                    </span>
                    <WalkTime lat={i.lat} lng={i.lng} className="text-[15px] font-semibold text-act-ink" />
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`Remove ${i.title} from my plan`}
                  className="flex w-12 shrink-0 items-center justify-center text-ink-2 hover:text-ink"
                  onClick={() => {
                    write(read().filter((s) => s !== i.slug));
                    void remind(i.slug, false);
                  }}
                >
                  <Icon name="close" size={20} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="flex flex-col gap-2 bg-surface p-4 shadow-e1">
        <p className="text-[17px] font-bold">A reminder before each one</p>
        <p className="text-[16px] text-ink-2">Turn on notifications and this phone gets a nudge about an hour before anything you&apos;ve saved.</p>
        <PushToggle compact />
      </div>
      <CalendarSubscribe plan={plan} />
      <p className="text-[15px] text-muted">Kept on this phone. If you clear your browser data, the plan goes too. A calendar copy stays.</p>
    </div>
  );
}

/** Puts the plan into Google, Apple or Outlook Calendar as a subscription that updates itself. */
function CalendarSubscribe({ plan }: { plan: string[] }) {
  // The link already made on this phone (read after hydration), or the one just made.
  const stored = useSyncExternalStore(noSubscription, calendarToken, () => null);
  const [created, setToken] = useState<string | null>(null);
  const token = created ?? stored;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const host = typeof window === "undefined" ? "" : window.location.host;
  const https = token ? `https://${host}/plan/${token}/calendar` : "";
  const webcal = token ? `webcal://${host}/plan/${token}/calendar` : "";
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 border-[1.5px] border-ink bg-surface px-4 text-[16px] font-bold";
  return (
    <div className="flex flex-col gap-2 bg-surface p-4 shadow-e1">
      <p className="flex items-center gap-2 text-[17px] font-bold">
        <Icon name="calendar" size={20} /> Put your plan in your calendar
      </p>
      {!token ? (
        <>
          <p className="text-[16px] text-ink-2">One link keeps Google or Apple Calendar in step with this list. Anything you save here shows up there.</p>
          <button
            type="button"
            disabled={busy}
            className="inline-flex min-h-12 items-center justify-center self-start bg-act px-5 text-[16px] font-bold text-on-act disabled:opacity-60"
            onClick={async () => {
              setBusy(true);
              setToken(await saveCalendar(null, plan));
              setBusy(false);
            }}
          >
            {busy ? "Making your link…" : "Make my calendar link"}
          </button>
        </>
      ) : (
        <>
          <p className="text-[16px] text-ink-2">Pick your calendar. It asks once, then checks for changes every few hours.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <a className={`${btn} border-act bg-act text-on-act`} href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`} target="_blank" rel="noreferrer">
              Google Calendar
            </a>
            <a className={btn} href={webcal}>
              Apple Calendar
            </a>
            <button
              type="button"
              className={btn}
              onClick={async () => {
                await navigator.clipboard?.writeText(https).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
          </div>
          <p className="text-[15px] text-muted">Anyone with this link sees your plan. Don&apos;t share it.</p>
        </>
      )}
    </div>
  );
}
