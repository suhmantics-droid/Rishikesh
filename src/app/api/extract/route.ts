import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { aiEnabled, extractFlyer } from "@/lib/extract";
import { readFlyer } from "@/lib/images";
import { clientIp, rateLimit } from "@/lib/util";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { uploadId } = (await req.json().catch(() => ({}))) as { uploadId?: string };
  if (!uploadId) return Response.json({ error: "Missing upload" }, { status: 400 });
  if (!aiEnabled()) return Response.json({ fields: null, reason: "Auto-fill isn't switched on — fill in the details below." });
  if (!rateLimit(`extract:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ fields: null, reason: "Auto-fill limit reached for now — fill in the details below." });
  }

  const cached = db().prepare("SELECT extracted_json FROM uploads WHERE id = ?").get(uploadId) as { extracted_json: string | null } | undefined;
  if (!cached) return Response.json({ error: "Upload not found" }, { status: 404 });
  if (cached.extracted_json) return Response.json({ fields: JSON.parse(cached.extracted_json) });

  const image = await readFlyer(uploadId);
  if (!image) return Response.json({ error: "Upload not found" }, { status: 404 });
  const venues = db().prepare("SELECT slug, name FROM venues WHERE is_demo = 0 ORDER BY name").all() as { slug: string; name: string }[];

  try {
    const fields = await extractFlyer(image, venues);
    db().prepare("UPDATE uploads SET extracted_json = ? WHERE id = ?").run(JSON.stringify(fields), uploadId);
    return Response.json({ fields });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ fields: null, reason: "Auto-fill is busy right now — fill in the details below." });
    } else if (e instanceof Anthropic.APIError) {
      console.error(`extract: API error ${e.status}`, e.message);
    } else {
      console.error("extract failed", e);
    }
    return Response.json({ fields: null, reason: "We couldn't read this flyer automatically — fill in the details below." });
  }
}
