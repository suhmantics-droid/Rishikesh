"use client";

import { useState } from "react";

/** "Paste a Google Maps link" → drops the pin there. */
export function MapLinkInput({ onPin, className = "" }: { onPin: (lat: number, lng: number) => void; className?: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function use() {
    if (!text.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/maplink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onPin(d.lat, d.lng);
      setMsg({ ok: true, text: "📍 Pin moved to that spot." });
      setText("");
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              use();
            }
          }}
          placeholder="Or paste a Google Maps link"
          className="min-h-12 min-w-0 flex-1 border-[1.5px] border-line-strong bg-surface px-3 text-[16px]"
          aria-label="Google Maps link or coordinates"
        />
        <button type="button" onClick={use} disabled={busy || !text.trim()} className="min-h-12 shrink-0 border-[1.5px] border-ink bg-surface px-4 text-[16px] font-bold disabled:opacity-50">
          {busy ? "Finding…" : "Use"}
        </button>
      </div>
      {msg ? <p className={`mt-1 text-[15px] ${msg.ok ? "text-act-ink" : "text-warn"}`}>{msg.text}</p> : null}
    </div>
  );
}
