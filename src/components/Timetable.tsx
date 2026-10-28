"use client";

import { useState } from "react";
import { daysLabel, formatTimeRange, WEEK_ORDER, WEEKDAY_LONG, WEEKDAY_SHORT } from "@/lib/dates";
import type { SessionT } from "@/lib/listings";
import { useNow } from "./Live";

/** A class timetable, one weekday at a time, the way people read one: "what's on Thursday?" */
export function Timetable({ sessions, todayWd, fallbackLabel }: { sessions: SessionT[]; todayWd: number; fallbackLabel: string }) {
  const days = WEEK_ORDER.filter((d) => sessions.some((s) => s.days.includes(d)));
  // Start on today, or the next day that has classes.
  const first = [0, 1, 2, 3, 4, 5, 6].map((i) => (todayWd + i) % 7).find((d) => days.includes(d)) ?? days[0];
  const [day, setDay] = useState(first);
  const now = useNow();
  if (!days.length) return null;
  const list = sessions
    .filter((s) => s.days.includes(day))
    .sort((a, b) => (a.start_time ?? "99").localeCompare(b.start_time ?? "99"));
  const isToday = day === todayWd;
  const ended = (s: SessionT) => {
    if (!isToday || !now || !s.start_time) return false;
    const end = s.end_time && s.end_time > s.start_time ? s.end_time : s.start_time;
    return end <= now.time;
  };
  const nextIdx = isToday && now ? list.findIndex((s) => s.start_time && s.start_time > now.time) : -1;

  return (
    <section className="flex flex-col gap-3 bg-surface px-3 pt-4 pb-2 sm:px-4" aria-labelledby="tt-h">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="tt-h" className="text-[21px] font-extrabold">
          Timetable
        </h2>
        <span className="text-[15px] font-semibold text-muted">
          {WEEKDAY_LONG[day]}
          {isToday ? ", today" : ""}
        </span>
      </div>
      <div role="tablist" aria-label="Day" className="flex gap-1">
        {WEEK_ORDER.map((d) => {
          const has = days.includes(d);
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={d === day}
              disabled={!has}
              onClick={() => setDay(d)}
              className={`flex min-h-11 flex-1 flex-col items-center justify-center border-[1.5px] text-[15px] leading-tight font-bold ${
                d === day ? "border-ink bg-ink text-wall" : has ? "border-line-strong bg-surface" : "border-dashed border-line-strong text-muted line-through"
              }`}
            >
              {WEEKDAY_SHORT[d]}
              <span className="text-[11px] font-bold no-underline">{d === todayWd ? "Today" : !has ? "Closed" : ""}</span>
            </button>
          );
        })}
      </div>
      <ul className="flex flex-col px-1">
        {list.map((s, i) => {
          const done = ended(s);
          const isNext = i === nextIdx;
          return (
            <li
              key={i}
              className={`grid grid-cols-[104px_1fr] gap-3 border-t border-line py-2.5 ${done ? "text-muted" : ""} ${isNext ? "-mx-3 border-transparent bg-now-soft px-3" : ""}`}
            >
              <span className="text-[16px] font-extrabold [font-stretch:88%]">{formatTimeRange(s.start_time, s.end_time) || "Time not listed"}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[16px] font-bold">
                  {s.label ?? fallbackLabel}
                  {isNext ? <span className="ml-1.5 bg-now px-1.5 py-0.5 align-[2px] text-[12px] font-extrabold text-on-now uppercase">Next</span> : null}
                </span>
                {done ? <span className="text-[14px]">ended</span> : s.days.length < 7 && s.days.length > 1 ? <span className="text-[14px] text-muted">{daysLabel(s.days)}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="px-1 pb-2 text-[14px] text-muted">From the flyer.</p>
    </section>
  );
}
