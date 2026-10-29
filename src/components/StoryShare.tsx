"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Shares the day's flyers as a 1080×1920 picture: straight into Instagram or WhatsApp status on a phone, or saves it. */
export function StoryShare({ when = "today", label = "Share as a story" }: { when?: "today" | "tomorrow" | "weekend"; label?: string }) {
  const [busy, setBusy] = useState(false);
  const src = `/today/story${when === "today" ? "" : `?when=${when}`}`;

  async function share() {
    setBusy(true);
    try {
      const blob = await fetch(src).then((r) => r.blob());
      const file = new File([blob], `tapovan-${when}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `What's on in Tapovan: ${window.location.origin}` }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={share} disabled={busy} data-track="share" className="inline-flex min-h-12 items-center gap-2 rounded-full border-[1.5px] border-ink bg-surface px-4 text-[16px] font-bold disabled:opacity-60">
      <Icon name="share" size={18} /> {busy ? "Making the picture…" : label}
    </button>
  );
}
