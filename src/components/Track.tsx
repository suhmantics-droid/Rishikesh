"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function send(body: Record<string, unknown>) {
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
