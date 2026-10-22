"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

function send(body: Record<string, unknown>) {
  const data = JSON.stringify(body);
  try {
    if (navigator.sendBeacon?.("/api/t", new Blob([data], { type: "application/json" }))) return;
  } catch {}
  fetch("/api/t", { method: "POST", body: data, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
}

/** Counts a page view on every client-side navigation (not admin or private pages). */
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (/^\/(admin|manage|alerts\/)/.test(pathname)) return;
    send({ page: true });
  }, [pathname]);
  return null;
}

/** Counts a flyer view (once per tab session) and taps on any element marked data-track="kind". */
export function EventTracker({ eventId }: { eventId: number }) {
  useEffect(() => {
    const key = `pinned:viewed:${eventId}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        send({ eventId, kind: "view" });
      }
    } catch {
      send({ eventId, kind: "view" });
    }
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (el) send({ eventId, kind: el.dataset.track });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [eventId]);
  return null;
}

/** "I'm interested" — social proof for visitors, and evidence for organisers that the listing works. */
export function InterestedButton({ eventId, initial }: { eventId: number; initial: number }) {
  const key = `pinned:interested:${eventId}`;
  const [count, setCount] = useState(initial);
  const [clicked, setClicked] = useState(false);
  const stored = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(key) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const on = stored || clicked;
  return (
    <button
      type="button"
      disabled={on}
      onClick={() => {
        setClicked(true);
        setCount((c) => c + 1);
        try {
          localStorage.setItem(key, "1");
        } catch {}
        send({ eventId, kind: "interested" });
      }}
      className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
        on ? "border-saffron bg-saffron-soft text-saffron-ink" : "border-line bg-card hover:border-ink-2"
      }`}
    >
      {on ? "★ Interested" : "☆ I'm interested"}
      {count > 0 ? <span className="rounded-full bg-paper-2 px-2 py-0.5 text-xs text-ink-2">{count}</span> : null}
    </button>
  );
}
