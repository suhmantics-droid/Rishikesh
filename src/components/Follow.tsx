"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

// Follows live in localStorage so anyone can tap "Follow" without signing up.
// The alerts page turns them into email alerts.

export type LocalFollow = { kind: "venue" | "artist" | "category"; target: string; label: string };
const KEY = "pinned:follows";

function read(): LocalFollow[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
let cache: LocalFollow[] | null = null;
const listeners = new Set<() => void>();
function snapshot() {
  if (cache === null) cache = read();
  return cache;
}
const EMPTY: LocalFollow[] = [];
export function writeFollows(next: LocalFollow[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}
export function useFollows() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    snapshot,
    () => EMPTY,
  );
}

export function FollowButton({
  kind,
  target,
  label,
  compact = false,
  chip = false,
}: LocalFollow & { compact?: boolean; /** Show the label in both states, no alerts link. */ chip?: boolean }) {
  const follows = useFollows();
  const on = follows.some((f) => f.kind === kind && f.target === target);
  function toggle() {
    writeFollows(on ? follows.filter((f) => !(f.kind === kind && f.target === target)) : [...follows, { kind, target, label }]);
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className={`rounded-full border px-3 py-1.5 text-[13px] font-bold transition ${
          on ? "border-ganga bg-ganga text-white" : "border-line bg-card text-ink-2 hover:border-ink-2"
        }`}
      >
        {chip ? `${on ? "✓" : "+"} ${label}` : on ? "✓ Following" : compact ? "+ Follow" : `+ Follow ${label}`}
      </button>
      {on && !compact && !chip ? (
        <Link href="/alerts" className="text-[13px] font-semibold text-saffron-ink underline">
          Get email alerts
        </Link>
      ) : null}
    </span>
  );
}
