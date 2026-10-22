import { CLICK_KINDS, recordEventClick, recordPageview, type ClickKind } from "@/lib/stats";
import { clientIp, rateLimit } from "@/lib/util";

// Beacon endpoint for analytics. Sent by the browser (so bots and link prefetches don't count).
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`t:${ip}`, 300, 60 * 60 * 1000)) return new Response(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as { page?: boolean; eventId?: number; kind?: string };
  const ua = req.headers.get("user-agent") ?? "";
  if (/bot|crawl|spider|preview|facebookexternalhit|whatsapp/i.test(ua)) return new Response(null, { status: 204 });
  if (body.page) recordPageview(ip, ua);
  if (body.eventId && CLICK_KINDS.includes(body.kind as ClickKind)) recordEventClick(Number(body.eventId), body.kind as ClickKind);
  return new Response(null, { status: 204 });
}
