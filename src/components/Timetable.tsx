"use client";

import { useState } from "react";
import { daysLabel, formatTimeRange, WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/dates";
import type { SessionT } from "@/lib/listings";

/** A class timetable, one weekday at a time — the way people actually read one: "what's on Thursday?" */
export function Timetable({ sessions, todayWd, fallbackLabel }: { sessions: SessionT[]; todayWd: number; fallbackLabel: string }) {
  const days = WEEK_ORDER.filter((d) => sessions.some((s) => s.days.includes(d)));
  // Start on today, or the next day that has classes.
  const first = [0, 1, 2, 3, 4, 5, 6].map((i) => (todayWd + i) % 7).find((d) => days.includes(d)) ?? days[0];
  const [day, setDay] = useState(first);
  if (!days.length) return null;
  const list = sessions
    .filter((s) => s.days.includes(day))
    .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));

  return (
    <section className="rounded-2xl border border-line bg-card p-4" aria-label="Timetable">
      <h2 className="font-display text-lg font-semibold">Timetable</h2>
      <div role="tablist" className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {days.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === day}
            onClick={() => setDay(d)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
              d === day ? "border-ganga bg-ganga text-on-ganga" : "border-line bg-card text-ink-2 hover:border-ganga/60"
            }`}
          >
            {d === todayWd ? "Today" : WEEKDAY_SHORT[d]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold text-muted uppercase">{WEEKDAY_LONG[day]}</p>
      <ul className="mt-1 divide-y divide-line">
        {list.map((s, i) => (
          <li key={i} className="flex items-baseline gap-3 py-2">
            <span className="w-28 shrink-0 font-display text-[15px] font-semibold">{formatTimeRange(s.start_time, s.end_time) || "Times on request"}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{s.label ?? fallbackLabel}</span>
              {s.days.length < 7 && s.days.length > 1 ? <span className="block text-xs text-muted">{daysLabel(s.days)}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
