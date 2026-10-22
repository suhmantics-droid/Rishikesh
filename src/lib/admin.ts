// Single shared admin password (ADMIN_PASSWORD). The cookie holds an HMAC, not the password.

import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pinned_admin";

function password() {
  const p = process.env.ADMIN_PASSWORD;
  if (p) return p;
  if (process.env.NODE_ENV !== "production") return "admin"; // local dev only
  return null;
}

function sessionValue() {
  const p = password();
  if (!p) return null;
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || p).update("pinned-admin-v1").digest("hex");
}

export function checkPassword(input: string) {
  const p = password();
  if (!p) return false;
  const a = Buffer.from(crypto.createHash("sha256").update(input).digest("hex"));
  const b = Buffer.from(crypto.createHash("sha256").update(p).digest("hex"));
  return crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  // Read the cookie before anything else: it marks the page as request-time. Returning early
  // would let Next.js prerender the logged-out view as a static page.
  const cookie = (await cookies()).get(COOKIE)?.value;
  const v = sessionValue();
  return !!v && cookie === v;
}

export async function setAdminCookie() {
  (await cookies()).set(COOKIE, sessionValue()!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE);
}
