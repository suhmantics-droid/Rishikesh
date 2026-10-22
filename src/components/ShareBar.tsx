"use client";

import { useState } from "react";
import { WhatsAppIcon } from "./Browse";

export function ShareBar({ title, text, calendarHref }: { title: string; text: string; calendarHref: string }) {
  const [copied, setCopied] = useState(false);
  const pageUrl = () => window.location.href.split("?")[0];
  async function share() {
    const url = pageUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  const btn = "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-bold text-ink-2 hover:border-ink-2";
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        className={btn}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl()}`)}`, "_blank")}
      >
        <WhatsAppIcon className="h-4 w-4" /> WhatsApp
      </button>
      <a className={btn} href={calendarHref}>
        📅 Calendar
      </a>
      <button type="button" className={btn} onClick={share}>
        {copied ? "Copied ✓" : "↗ Share"}
      </button>
    </div>
  );
}

export function ReportLink({ eventId }: { eventId: number }) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  if (state === "sent") return <p className="text-xs text-muted">Thanks — we&apos;ll take a look.</p>;
  if (state === "idle")
    return (
      <button type="button" className="text-xs text-muted underline" onClick={() => setState("open")}>
        Report this flyer
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2 text-xs"
      onSubmit={async (e) => {
        e.preventDefault();
        const reason = new FormData(e.currentTarget).get("reason");
        await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, reason }) });
        setState("sent");
      }}
    >
      <select name="reason" className="rounded-lg border border-line bg-card px-2 py-1">
        <option>Cancelled or wrong date</option>
        <option>Wrong venue or price</option>
        <option>Spam or not an event</option>
        <option>Offensive</option>
      </select>
      <button className="rounded-lg bg-ink px-2 py-1 font-bold text-paper">Send</button>
    </form>
  );
}
