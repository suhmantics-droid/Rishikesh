"use client";

import Link from "next/link";
import { Icon } from "./Icon";
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
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className={`inline-flex items-center gap-1.5 border-[1.5px] font-bold ${compact || chip ? "min-h-11 px-3 text-[15px]" : "min-h-12 px-4 text-[16px]"} ${
          on ? "border-ink bg-ink text-wall" : "border-ink bg-surface text-ink hover:bg-wall-2"
        }`}
      >
        <Icon name={on ? "check" : "follow"} size={18} />
        {chip ? label : on ? "Following" : compact ? "Follow" : `Follow ${label}`}
      </button>
      {on && !compact && !chip ? (
        <Link href="/alerts" className="flex min-h-11 items-center text-[16px] font-bold text-act-ink underline">
          Choose how to hear
        </Link>
      ) : null}
    </span>
  );
}
