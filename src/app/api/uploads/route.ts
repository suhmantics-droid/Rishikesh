import { isAdmin } from "@/lib/admin";
import { inBackground } from "@/lib/background";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES, saveFlyer } from "@/lib/images";
import { linksFromCodes, scanQr } from "@/lib/qr";
import { extractUpload, findDuplicates } from "@/lib/uploads";
import { clientIp, flyerUrl, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  const admin = await isAdmin();
  if (!admin && !rateLimit(`upload:${clientIp(req)}`, 30, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many uploads — try again in a bit." }, { status: 429 });
  }
  const form = await req.formData();
  const file = form.get("flyer");
  if (!(file instanceof File)) return Response.json({ error: "No image received." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "That image is over 12 MB." }, { status: 413 });
  if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
    return Response.json({ error: "Please upload a photo or image of the flyer." }, { status: 415 });
  }
  // Admin batch uploads wait in the To do queue until they're posted.
  const batch = admin && form.get("batch") === "1";
  try {
    const original = Buffer.from(await file.arrayBuffer());
    const saved = await saveFlyer(original, { keepOriginal: true, batch });
    // QR codes are read from the full-resolution photo: small codes don't survive downsizing.
    const links = await scanQr(original)
      .then(linksFromCodes)
      .catch((e) => {
        console.error("QR scan failed", e);
        return [];
      });
    await db().prepare("UPDATE uploads SET qr_json = ? WHERE id = ?").run(JSON.stringify(links), saved.id);
    // Read batch photos straight away, so each is filled in by the time it's opened from the queue.
    if (batch) inBackground("batch extract", () => extractUpload(saved.id));
    return Response.json({ id: saved.id, w: saved.w, h: saved.h, url: flyerUrl(saved.id), links, duplicates: await findDuplicates(saved.id) });
  } catch (e) {
    console.error("upload failed", e);
    return Response.json({ error: "We couldn't read that image. Try a JPG or PNG screenshot." }, { status: 422 });
  }
}
