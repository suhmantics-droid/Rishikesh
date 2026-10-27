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
          placeholder="…or paste a Google Maps link"
          className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1.5 text-sm"
          aria-label="Google Maps link or coordinates"
        />
        <button type="button" onClick={use} disabled={busy || !text.trim()} className="shrink-0 rounded-lg border border-line bg-card px-3 text-sm font-bold disabled:opacity-50">
          {busy ? "…" : "Use"}
        </button>
      </div>
      {msg ? <p className={`mt-1 text-xs ${msg.ok ? "text-ganga" : "text-saffron-ink"}`}>{msg.text}</p> : null}
    </div>
  );
}
