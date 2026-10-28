"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useFollows } from "./Follow";

type State = "loading" | "unsupported" | "ios-install" | "off" | "on" | "busy" | "denied";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  return reg ? reg.pushManager.getSubscription() : null;
}

/**
 * One tap to get phone notifications for everything this device follows. Follows live in
 * localStorage (Follow buttons); whenever they change, the server copy is updated.
 */
const noopSubscribe = () => () => {};

/** What this browser can do, read once on the client ("server" during server rendering). */
function capability(): "ok" | "unsupported" | "ios-install" | "denied" {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  return Notification.permission === "denied" ? "denied" : "ok";
}

function storedDaily() {
  try {
    return localStorage.getItem("pinned:pushDaily") !== "0";
  } catch {
    return true;
  }
}

/**
 * One tap to get phone notifications for everything this device follows. Follows live in
 * localStorage (Follow buttons); whenever they change, the server copy is updated.
 */
export function PushToggle({ compact = false }: { compact?: boolean }) {
  const follows = useFollows();
  const cap = useSyncExternalStore(noopSubscribe, capability, () => "server" as const);
  const savedDaily = useSyncExternalStore(noopSubscribe, storedDaily, () => true);
  const [dailyChoice, setDailyChoice] = useState<boolean | null>(null);
  const daily = dailyChoice ?? savedDaily;
  const [sub, setSub] = useState<"unknown" | "on" | "off">("unknown");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const synced = useRef("");

  useEffect(() => {
    if (cap !== "ok") return;
    currentSubscription()
      .then((s) => setSub(s ? "on" : "off"))
      .catch(() => setSub("off"));
  }, [cap]);

  const state: State =
    cap === "server" ? "loading" : blocked || cap === "denied" ? "denied" : cap !== "ok" ? cap : busy ? "busy" : sub === "unknown" ? "loading" : sub;

  async function sync(sub: PushSubscription, d = daily) {
    const body = { subscription: sub.toJSON(), follows: follows.map(({ kind, target }) => ({ kind, target })), daily: d };
    const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error("Could not save your notification settings");
    synced.current = JSON.stringify([body.follows, d]);
  }

  // Keep the server's copy of this phone's follows up to date.
  useEffect(() => {
    if (sub !== "on") return;
    const key = JSON.stringify([follows.map(({ kind, target }) => ({ kind, target })), daily]);
    if (key === synced.current) return;
    const t = setTimeout(() => {
      currentSubscription()
        .then((s) => s && sync(s))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [follows, daily, sub]);

  async function enable() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") setBlocked(true);
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const { publicKey } = await fetch("/api/push").then((r) => r.json());
      const subscription =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
      await sync(subscription);
      setSub("on");
    } catch (e) {
      setError((e as Error).message || "Notifications couldn't be turned on in this browser.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    const subscription = await currentSubscription().catch(() => null);
    if (subscription) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
      await subscription.unsubscribe().catch(() => {});
    }
    setSub("off");
    setBusy(false);
  }

  if (state === "loading") return null;
  if (state === "unsupported") return compact ? null : <p className="text-sm text-muted">This browser can&apos;t show notifications — use email alerts below.</p>;
  if (state === "ios-install")
    return (
      <p className="text-sm text-ink-2">
        📲 On iPhone: tap <b>Share</b> → <b>Add to Home Screen</b>, open {compact ? "it" : "WhatsOnTapovan"} from your home screen, then turn on notifications.
      </p>
    );
  if (state === "denied") return <p className="text-sm text-muted">Notifications are blocked for this site in your browser settings.</p>;

  return (
    <div className="flex flex-col gap-2">
      {state === "on" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-ganga px-3 py-1.5 text-[13px] font-bold text-on-ganga">🔔 Notifications on</span>
          <span className="text-sm text-muted">
            {follows.length ? `for ${follows.length} thing${follows.length === 1 ? "" : "s"} you follow` : "follow something to get notified"}
          </span>
          {!compact ? (
            <button type="button" className="text-sm text-muted underline" onClick={disable}>
              Turn off
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={state === "busy"}
          className="self-start rounded-xl bg-ganga px-4 py-2.5 text-sm font-bold text-on-ganga disabled:opacity-60"
        >
          {state === "busy" ? "Turning on…" : "🔔 Notify me on this phone"}
        </button>
      )}
      {!compact ? (
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={daily}
            onChange={(e) => {
              setDailyChoice(e.target.checked);
              try {
                localStorage.setItem("pinned:pushDaily", e.target.checked ? "1" : "0");
              } catch {}
            }}
            className="h-4 w-4 accent-[var(--ganga)]"
          />
          Also a morning notification of what&apos;s on today
        </label>
      ) : null}
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
