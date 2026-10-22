import { MAX_UPLOAD_BYTES, saveFlyer } from "@/lib/images";
import { clientIp, flyerUrl, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  if (!rateLimit(`upload:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many uploads — try again in a bit." }, { status: 429 });
  }
  const form = await req.formData();
  const file = form.get("flyer");
  if (!(file instanceof File)) return Response.json({ error: "No image received." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "That image is over 12 MB." }, { status: 413 });
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return Response.json({ error: "Please upload a photo or image of the flyer." }, { status: 415 });
  }
  try {
    const saved = await saveFlyer(Buffer.from(await file.arrayBuffer()));
    return Response.json({ id: saved.id, w: saved.w, h: saved.h, url: flyerUrl(saved.id) });
  } catch (e) {
    console.error("upload failed", e);
    return Response.json({ error: "We couldn't read that image. Try a JPG or PNG screenshot." }, { status: 422 });
  }
}
