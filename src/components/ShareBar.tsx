"use client";

import { useState } from "react";
import { WhatsAppIcon } from "./Browse";
import { Icon } from "./Icon";

export function ShareBar({ title, text, calendarHref }: { title: string; text: string; calendarHref: string | null }) {
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
  const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-transparent px-3 text-[16px] font-bold text-ink hover:bg-wall-2";
  return (
    <div className={`grid gap-2 ${calendarHref ? "grid-cols-3" : "grid-cols-2"}`}>
      <button
        type="button"
        data-track="share"
        className={btn}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${pageUrl()}`)}`, "_blank")}
      >
        <WhatsAppIcon className="h-[18px] w-[18px]" /> WhatsApp
      </button>
      {calendarHref ? (
        <a data-track="calendar" className={btn} href={calendarHref}>
          <Icon name="calendar" size={18} /> Calendar
        </a>
      ) : null}
      <button type="button" data-track="share" className={btn} onClick={share}>
        <Icon name={copied ? "check" : "share"} size={18} /> {copied ? "Copied" : "Share"}
      </button>
    </div>
  );
}

export function ReportLink({ eventId }: { eventId: number }) {
  const [state, setState] = useState<"idle" | "open" | "sent">("idle");
  if (state === "sent") return <p className="text-[15px] text-muted">Thanks. We&apos;ll take a look today.</p>;
  if (state === "idle")
    return (
      <button type="button" className="min-h-11 text-[16px] font-bold underline" onClick={() => setState("open")}>
        Report this flyer
      </button>
    );
  return (
    <form
      className="flex flex-wrap items-center gap-2 text-[15px]"
      onSubmit={async (e) => {
        e.preventDefault();
        const reason = new FormData(e.currentTarget).get("reason");
        await fetch("/api/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, reason }) });
        setState("sent");
      }}
    >
      <select name="reason" aria-label="What's wrong with this flyer" className="min-h-11 border-[1.5px] border-line-strong bg-surface px-2">
        <option>Cancelled or wrong date</option>
        <option>Wrong venue or price</option>
        <option>Spam or not an event</option>
        <option>Offensive</option>
      </select>
      <button className="min-h-11 rounded-full bg-ink px-4 font-bold text-wall">Send</button>
    </form>
  );
}
