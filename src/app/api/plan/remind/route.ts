import { setReminder } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/util";

// Turns a "starting soon" reminder on or off for a saved flyer, for a phone with notifications on.
export async function POST(req: Request) {
  if (!rateLimit(`remind:${clientIp(req)}`, 120, 60 * 60 * 1000)) return Response.json({ error: "Slow down" }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { endpoint?: string; slug?: string; on?: boolean } | null;
  if (!body?.endpoint || !body.slug || typeof body.endpoint !== "string" || body.endpoint.length > 1000) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const at = await setReminder(body.endpoint, body.slug, body.on !== false);
  return Response.json({ at });
}
