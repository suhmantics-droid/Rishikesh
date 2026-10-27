import { z } from "zod";
import { db } from "@/lib/db";
import { readBestCopy, saveFlyer } from "@/lib/images";
import { clientIp, flyerUrl, rateLimit } from "@/lib/util";
import { straighten } from "@/lib/warp";

const pt = z.tuple([z.number().min(-0.05).max(1.05), z.number().min(-0.05).max(1.05)]);
const Body = z.object({ corners: z.tuple([pt, pt, pt, pt]) });

/** Flattens and crops an uploaded flyer photo to the four corners the organiser dragged into place. */
export async function POST(req: Request, ctx: RouteContext<"/api/uploads/[id]/straighten">) {
  if (!rateLimit(`straighten:${clientIp(req)}`, 60, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many tries — give it a minute." }, { status: 429 });
  }
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Drag the four corners onto the flyer." }, { status: 400 });
  const source = await readBestCopy(id);
  if (!source) return Response.json({ error: "Upload not found — please upload the photo again." }, { status: 404 });
  try {
    const flat = await straighten(source, parsed.data.corners);
    const saved = await saveFlyer(flat, { parent: id });
    // The QR codes and details were read from the full photo; they still belong to this flyer.
    db()
      .prepare("UPDATE uploads SET qr_json = p.qr_json, extracted_json = p.extracted_json FROM (SELECT qr_json, extracted_json FROM uploads WHERE id = ?) AS p WHERE id = ?")
      .run(id, saved.id);
    return Response.json({ id: saved.id, w: saved.w, h: saved.h, url: flyerUrl(saved.id) });
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Couldn't straighten that." }, { status: 422 });
  }
}
