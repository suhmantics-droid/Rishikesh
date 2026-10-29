"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { todayIST } from "@/lib/dates";
import { listingStatus, STATUS_TONE } from "@/lib/status";

// Manage links posted from this phone, so organisers find their flyers under Mine without digging up a message.

const KEY = "pinned:mine";
type Saved = { token: string; title: string };

function read(): Saved[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Saved[];
  } catch {
    return [];
  }
}
let cache: { raw: string | null; list: Saved[] } = { raw: null, list: [] };
function snapshot() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) cache = { raw, list: read() };
  return cache.list;
}
const EMPTY: Saved[] = [];
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(KEY, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(KEY, cb);
  };
}

/** Remembers a listing's manage link on this phone. */
export function rememberListing(token: string, title: string) {
  try {
    const list = read().filter((s) => s.token !== token);
    localStorage.setItem(KEY, JSON.stringify([{ token, title }, ...list].slice(0, 30)));
    window.dispatchEvent(new Event(KEY));
  } catch {}
}

/** Drop-in for the manage page: opening your link once is enough to find it again under Mine. */
export function RememberListing({ token, title }: { token: string; title: string }) {
  useEffect(() => rememberListing(token, title), [token, title]);
  return null;
}

type Info = { title: string; slug: string; status: string; live_until: string | null; is_live: boolean; views: number; thumb: string | null };

export function MyFlyers() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => EMPTY);
  const [info, setInfo] = useState<Record<string, Info | "gone">>({});
  const key = saved.map((s) => s.token).join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    Promise.all(
      key.split(",").map(async (t) => {
        const r = await fetch(`/api/listings/${t}`).catch(() => null);
        if (!r) return [t, null] as const;
        return [t, r.ok ? ((await r.json()) as Info) : ("gone" as const)] as const;
      }),
    ).then((rows) => {
      if (cancelled) return;
      setInfo(Object.fromEntries(rows.filter(([, v]) => v !== null)) as Record<string, Info | "gone">);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!saved.length)
    return (
      <div className="flex flex-col items-start gap-2 border-[1.5px] border-dashed border-line-strong px-4 py-4">
        <span className="text-[17px] font-bold">No flyers posted from this phone</span>
        <span className="text-[16px] text-ink-2">When you post one, it shows up here with its status. Each flyer also has its own private link.</span>
        <Link href="/post" className="mt-1 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-[16px] font-bold text-wall">
          Post a flyer
        </Link>
      </div>
    );

  const today = todayIST();
  return (
    <ul className="flex flex-col gap-2">
      {saved.map((s) => {
        const i = info[s.token];
        if (i === "gone") return null;
        const st = i ? listingStatus(i, i.is_live, today) : null;
        return (
          <li key={s.token}>
            <Link href={`/manage/${s.token}`} className="grid grid-cols-[56px_1fr] gap-3 bg-surface p-3 shadow-e1 hover:bg-slip">
              {i?.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={i.thumb} alt="" width={56} className="h-auto w-14 shadow-e1" />
              ) : (
                <span className="h-[72px] w-14 bg-wall-2" aria-hidden />
              )}
              <span className="flex min-w-0 flex-col items-start gap-1">
                {st ? <span className={`border px-2 py-0.5 text-[13px] font-extrabold tracking-[0.04em] uppercase ${STATUS_TONE[st.key]}`}>{st.word}</span> : null}
                <span className="text-[17px] leading-tight font-bold">{i?.title ?? s.title}</span>
                <span className="text-[15px] text-ink-2">
                  {st?.detail ?? "Checking…"}
                  {i && i.is_live ? ` · ${i.views.toLocaleString("en-IN")} views` : ""}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
