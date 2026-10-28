// Turns a Google Maps link (or typed coordinates) into a map pin. The quickest way to fix a venue's
// pin from a phone: open the place in Google Maps → Share → copy link → paste.

export type LatLng = { lat: number; lng: number };

// Rishikesh and around; anything outside is a wrong paste.
const inArea = (p: LatLng) => p.lat > 29.9 && p.lat < 30.4 && p.lng > 78.1 && p.lng < 78.6;

const num = String.raw`(-?\d{1,3}\.\d{3,})`;
const PATTERNS = [
  // The place itself, in Google's data blob: !3d<lat>!4d<lng> (the last one is the selected place).
  new RegExp(String.raw`!3d${num}!4d${num}`, "g"),
  // ?q=, query=, ll=, destination=, center= followed by "lat,lng".
  new RegExp(String.raw`(?:[?&](?:q|query|ll|sll|destination|daddr|center)=)(?:loc:)?${num}(?:,|%2C)\s*${num}`, "gi"),
  // /place/<lat>,<lng> or /search/<lat>,+<lng>
  new RegExp(String.raw`/(?:place|search|dir)/${num}(?:,|%2C)\+?\s*${num}`, "gi"),
  // The map's centre: /@<lat>,<lng>,<zoom>z
  new RegExp(String.raw`/@${num},${num}`, "g"),
];

/** Coordinates from a Google Maps URL, page text or a typed "30.1325, 78.3207". */
export function coordsFromText(text: string): LatLng | null {
  const t = text.trim();
  const plain = t.match(new RegExp(String.raw`^${num}\s*,\s*${num}$`));
  if (plain) {
    const p = { lat: Number(plain[1]), lng: Number(plain[2]) };
    return inArea(p) ? p : null;
  }
  for (const re of PATTERNS) {
    const all = [...t.matchAll(re)];
    for (const m of all.reverse()) {
      const p = { lat: Number(m[1]), lng: Number(m[2]) };
      if (inArea(p)) return p;
    }
  }
  return null;
}

const SHORT_HOSTS = /^(maps\.app\.goo\.gl|goo\.gl|g\.co|maps\.google\.[a-z.]+|(www\.)?google\.[a-z.]+)$/i;

/**
 * Coordinates from a Google Maps link, following short links (maps.app.goo.gl/…) through their
 * redirects, and reading the final page if the coordinates aren't in any URL.
 */
export async function resolveMapLink(input: string, fetcher: typeof fetch = fetch): Promise<LatLng | null> {
  const direct = coordsFromText(input);
  if (direct) return direct;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (!SHORT_HOSTS.test(url.hostname)) return null;
  let current = url.toString();
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetcher(current, {
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WhatsOnTapovan/1.0)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    if (!res) return null;
    const next = res.headers.get("location");
    if (next) {
      current = new URL(next, current).toString();
      const found = coordsFromText(decodeURIComponent(current));
      if (found) return found;
      continue;
    }
    if (res.ok) return coordsFromText(decodeURIComponent((await res.text()).slice(0, 400_000)));
    return null;
  }
  return null;
}
