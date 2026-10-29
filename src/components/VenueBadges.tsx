import { formatDayLong } from "@/lib/dates";
import { googleListingLink } from "@/lib/util";
import { Icon } from "./Icon";

/** WhatsOnTapovan's own pick: a small sandalwood seal. Never paid for. */
export function RecommendedBadge() {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 border-[1.5px] border-sandal px-2.5 text-[14px] font-extrabold tracking-[0.04em] text-sandal uppercase">
      <Icon name="recommended" size={16} /> Recommended
    </span>
  );
}

/** "4.7 · 8,067 reviews", from Google, linking to the listing, with the date the numbers were copied. */
export function GoogleRating({
  venue,
  link = true,
  className = "",
}: {
  venue: { name: string; google_url: string | null; google_rating: number | null; google_reviews: number | null; google_checked: string | null };
  link?: boolean;
  className?: string;
}) {
  if (!venue.google_rating) return null;
  const body = (
    <>
      <Icon name="rating" size={16} className="text-sandal" filled />
      <span className="font-bold">{venue.google_rating.toFixed(1)}</span>
      {venue.google_reviews ? <span className="text-muted">· {venue.google_reviews.toLocaleString("en-IN")}</span> : null}
      <span className="sr-only"> on Google{venue.google_reviews ? " reviews" : ""}</span>
    </>
  );
  const cls = `inline-flex items-center gap-1 text-[15px] text-ink-2 ${className}`;
  if (!link) return <span className={cls}>{body}</span>;
  return (
    <a
      href={googleListingLink(venue)}
      target="_blank"
      rel="noreferrer"
      title={venue.google_checked ? `On Google Maps, checked ${formatDayLong(venue.google_checked)}` : "On Google Maps"}
      className={`${cls} hover:text-ink`}
    >
      {body}
    </a>
  );
}
