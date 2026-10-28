import crypto from "node:crypto";
import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/util";

// Creates or updates someone's private calendar link from the flyers saved on their phone.
// The token is the only key: whoever has the link can read the plan, nobody can list them.
export async function POST(req: Request) {
  if (!rateLimit(`calendar:${clientIp(req)}`, 120, 60 * 60 * 1000)) return Response.json({ error: "Slow down" }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { token?: unknown; slugs?: unknown };
  const slugs = (Array.isArray(body.slugs) ? body.slugs : []).filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{3,80}$/.test(s)).slice(0, 60);
  const given = typeof body.token === "string" && /^[A-Za-z0-9_-]{24}$/.test(body.token) ? body.token : null;
  if (given) {
    const r = await db().prepare("UPDATE calendar_feeds SET slugs = ?, updated_at = datetime('now') WHERE token = ?").run(JSON.stringify(slugs), given);
    if (r.changes) return Response.json({ token: given });
  }
  const token = crypto.randomBytes(18).toString("base64url");
  await db().prepare("INSERT INTO calendar_feeds (token, slugs) VALUES (?, ?)").run(token, JSON.stringify(slugs));
  return Response.json({ token });
}
