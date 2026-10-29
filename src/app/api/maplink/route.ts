import { resolveMapLink } from "@/lib/maplink";
import { clientIp, rateLimit } from "@/lib/util";

// Pasted Google Maps link (or "lat, lng") → a map pin. Short links are followed on the server.
export async function POST(req: Request) {
  if (!rateLimit(`maplink:${clientIp(req)}`, 40, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many tries. Tap the map instead." }, { status: 429 });
  }
  const { text } = (await req.json().catch(() => ({}))) as { text?: string };
  if (!text || text.length > 2000) return Response.json({ error: "Paste a Google Maps link." }, { status: 400 });
  const pin = await resolveMapLink(text);
  if (!pin) {
    return Response.json(
      { error: "Couldn't find a spot in Rishikesh in that link. In Google Maps, tap the place, then Share → Copy link, and paste it here." },
      { status: 422 },
    );
  }
  return Response.json(pin);
}
