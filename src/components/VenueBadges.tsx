import { formatDayLong } from "@/lib/dates";
import { googleListingLink } from "@/lib/util";

/** Places we send people to: a small saffron seal. */
export function RecommendedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-saffron-soft px-2.5 py-0.5 text-xs font-bold text-saffron-ink">
      ✦ Recommended
    </span>
  );
}

/** "★ 4.7 · 181 Google reviews", linking to the listing, with the date the numbers were copied. */
export function GoogleRating({
  venue,
}: {
  venue: { name: string; google_url: string | null; google_rating: number | null; google_reviews: number | null; google_checked: string | null };
}) {
  if (!venue.google_rating) return null;
  return (
    <a
      href={googleListingLink(venue)}
      target="_blank"
      rel="noreferrer"
      title={venue.google_checked ? `On Google Maps, checked ${formatDayLong(venue.google_checked)}` : "On Google Maps"}
      className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 hover:text-ink"
    >
      <span className="text-saffron">★</span> {venue.google_rating.toFixed(1)}
      {venue.google_reviews ? <span className="text-muted">· {venue.google_reviews} Google reviews</span> : null}
    </a>
  );
}
