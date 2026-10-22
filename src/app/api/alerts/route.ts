import { z } from "zod";
import { FollowSchema, subscribe } from "@/lib/alerts";
import { clientIp, rateLimit } from "@/lib/util";

const Body = z.object({ email: z.string().trim().email().max(120), follows: FollowSchema, daily: z.boolean() });

export async function POST(req: Request) {
  if (!rateLimit(`alerts:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many requests — try again later." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your email address." }, { status: 400 });
  if (!parsed.data.follows.length && !parsed.data.daily) {
    return Response.json({ error: "Pick at least one thing to follow, or the daily email." }, { status: 400 });
  }
  const r = await subscribe(parsed.data.email, parsed.data.follows, parsed.data.daily);
  return Response.json(r);
}
