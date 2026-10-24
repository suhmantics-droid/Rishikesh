import { customAlphabet } from "nanoid";

export const shortId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 6);
export const token = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz", 24);
export const uploadId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 14);

export function slugify(s: string, max = 48): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max)
      .replace(/-+$/g, "") || "event"
  );
}

export function priceLabel(e: { price_type: string; price_min: number | null; price_max: number | null; price_note?: string | null }) {
  switch (e.price_type) {
    case "free":
      return "Free";
    case "donation":
      return e.price_min ? `Donation (₹${e.price_min} suggested)` : "By donation";
    case "paid":
      if (e.price_min && e.price_max && e.price_max !== e.price_min) return `₹${e.price_min}–${e.price_max}`;
      if (e.price_min) return `₹${e.price_min}`;
      return e.price_note || "Paid";
    default:
      return e.price_note || "Price on flyer";
  }
}

export function priceShort(e: { price_type: string; price_min: number | null; price_max: number | null }) {
  if (e.price_type === "free") return "Free";
  if (e.price_type === "donation") return "Donation";
  if (e.price_type === "paid" && e.price_min) return e.price_max && e.price_max !== e.price_min ? `₹${e.price_min}+` : `₹${e.price_min}`;
  return "";
}

export function flyerUrl(id: string | null, size: "sm" | "lg" = "lg") {
  if (!id) return null;
  return size === "sm" ? `/f/${id}-sm.webp` : `/f/${id}.webp`;
}

/** wa.me wants digits only with country code; assume India when 10 digits are given. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length === 10) d = "91" + d;
  if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export function instagramHandle(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.trim().match(/(?:instagram\.com\/)?@?([A-Za-z0-9._]{1,30})\/?$/);
  return m ? m[1] : null;
}

export function safeUrl(s: string | null | undefined): string | null {
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function googleMapsLink(v: { name: string; lat: number | null; lng: number | null }) {
  // Searching by name finds the real business listing even if our pin is a little off.
  const q = encodeURIComponent(`${v.name}, Tapovan, Rishikesh`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function directionsLink(v: { lat: number | null; lng: number | null; name: string; coords_verified?: number }) {
  // Until a pin is checked, route to the place by name: Google knows most Tapovan cafes and studios.
  const destination =
    v.lat != null && v.lng != null && v.coords_verified ? `${v.lat},${v.lng}` : encodeURIComponent(`${v.name}, Tapovan, Rishikesh`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=walking`;
}

/** Tiny fixed-window rate limiter, per process. Good enough for one server. */
const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= max;
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
