"use client";

import { useOffline } from "next/offline";
import { useEffect } from "react";

/** A strip under the header while the connection is down. */
export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <div role="status" className="bg-ink px-4 py-2 text-center text-[15px] font-semibold text-wall">
      You&apos;re offline, so this is the last saved list. It&apos;ll refresh when you&apos;re back online.
    </div>
  );
}

/** Installs the service worker (offline copies + notifications) in production. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
