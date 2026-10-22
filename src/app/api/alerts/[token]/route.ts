import { z } from "zod";
import { FollowSchema, unsubscribe, updateSubscriber } from "@/lib/alerts";

const Body = z.object({ follows: FollowSchema, daily: z.boolean() });

export async function PUT(req: Request, ctx: RouteContext<"/api/alerts/[token]">) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid" }, { status: 400 });
  const ok = updateSubscriber((await ctx.params).token, parsed.data.follows, parsed.data.daily);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/alerts/[token]">) {
  unsubscribe((await ctx.params).token);
  return Response.json({ ok: true });
}
