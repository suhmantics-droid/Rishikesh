import { db } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  if (!rateLimit(`report:${clientIp(req)}`, 10, 60 * 60 * 1000)) return Response.json({ ok: true });
  const { eventId, reason } = (await req.json().catch(() => ({}))) as { eventId?: number; reason?: string };
  if (!eventId || !reason) return Response.json({ error: "Missing fields" }, { status: 400 });
  const exists = db().prepare("SELECT 1 FROM events WHERE id = ?").get(eventId);
  if (exists) db().prepare("INSERT INTO reports (event_id, reason) VALUES (?, ?)").run(eventId, String(reason).slice(0, 200));
  return Response.json({ ok: true });
}
