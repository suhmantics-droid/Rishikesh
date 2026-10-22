import { connection } from "next/server";
import { z } from "zod";
import { FollowSchema } from "@/lib/alerts";
import { removePushSubscription, savePushSubscription, vapidPublicKey } from "@/lib/push";
import { clientIp, rateLimit } from "@/lib/util";

const Sub = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function GET() {
  await connection(); // keys live in the database; never bake them in at build time
  return Response.json({ publicKey: vapidPublicKey() });
}

/** Subscribe this phone, or update what it follows. */
export async function POST(req: Request) {
  if (!rateLimit(`push:${clientIp(req)}`, 60, 60 * 60 * 1000)) return Response.json({ error: "Slow down" }, { status: 429 });
  const parsed = z.object({ subscription: Sub, follows: FollowSchema, daily: z.boolean() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid subscription" }, { status: 400 });
  savePushSubscription(parsed.data.subscription, parsed.data.follows, parsed.data.daily);
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string };
  if (endpoint) removePushSubscription(endpoint);
  return Response.json({ ok: true });
}
