import { isAdmin } from "@/lib/admin";
import { MAX_UPLOAD_BYTES } from "@/lib/images";
import { PHOTO_SLOTS, removePhoto, savePhoto, setPhotoCredit, type PhotoSlot } from "@/lib/photos";

const isSlot = (s: unknown): s is PhotoSlot => PHOTO_SLOTS.some((p) => p.key === s);

/** Upload or replace a site photo, update its credit, or remove it. Admins only. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const form = await req.formData();
  const slot = form.get("slot");
  if (!isSlot(slot)) return Response.json({ error: "Unknown photo slot" }, { status: 400 });
  if (form.get("remove")) {
    removePhoto(slot);
    return Response.json({ ok: true });
  }
  const credit = String(form.get("credit") ?? "");
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "That photo is over 12 MB." }, { status: 413 });
    try {
      await savePhoto(slot, Buffer.from(await file.arrayBuffer()), credit);
    } catch {
      return Response.json({ error: "Couldn't read that image — try a JPG." }, { status: 422 });
    }
  } else {
    setPhotoCredit(slot, credit);
  }
  return Response.json({ ok: true });
}
