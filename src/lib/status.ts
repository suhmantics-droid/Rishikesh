import { addDays, formatDay } from "./dates";

export type ListingStatus = { key: "draft" | "review" | "changes" | "live" | "ending" | "ended" | "down"; word: string; detail: string };

/** The organiser's view of a listing, in the same words everywhere (Mine, the manage page, WhatsApp). */
export function listingStatus(e: { status: string; live_until: string | null; review_note?: string | null }, isLive: boolean, today: string): ListingStatus {
  if (e.status === "changes_needed")
    return { key: "changes", word: "Changes needed", detail: e.review_note ? `\u201c${e.review_note}\u201d` : "We have a question about it. Check WhatsApp, then fix it here." };
  if (e.status === "pending_payment") return { key: "draft", word: "Not sent yet", detail: "Send it for review to put it on the wall." };
  if (e.status === "pending_review")
    return { key: "review", word: "In review", detail: "We check it the same day and message you on WhatsApp." };
  if (e.status === "live" && isLive && e.live_until && e.live_until <= addDays(today, 5))
    return { key: "ending", word: "Ending soon", detail: `On the wall until ${formatDay(e.live_until, today)}. Renew to keep it up.` };
  if (e.status === "live" && isLive) return { key: "live", word: "Live", detail: `On the wall until ${formatDay(e.live_until!, today)}.` };
  if (e.status === "live") return { key: "ended", word: "Ended", detail: e.live_until ? `Came down ${formatDay(e.live_until, today)}.` : "No longer on the wall." };
  return { key: "down", word: "Taken down", detail: "Not shown on the wall. Message us if you think this is a mistake." };
}

export const STATUS_TONE: Record<ListingStatus["key"], string> = {
  draft: "bg-surface text-ink border-ink border-dashed",
  changes: "bg-warn-soft text-warn-soft-ink border-warn",
  review: "bg-now-soft text-ink border-now",
  live: "bg-act text-on-act border-act",
  ending: "bg-now text-on-now border-now",
  ended: "bg-wall-2 text-ink-2 border-line-strong",
  down: "bg-warn-soft text-warn-soft-ink border-warn",
};
