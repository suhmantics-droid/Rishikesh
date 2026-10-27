// Site photographs (not flyers): the home banner and the Ganga Aarti card. Uploaded by the
// admin from a phone; until then the page shows a labelled placeholder in the river colours.

import sharp from "sharp";
import { db } from "./db";
import { saveFile } from "./storage";
import { uploadId } from "./util";

export const PHOTO_SLOTS = [
  { key: "hero", label: "Home banner", want: "The Ganga at Laxman Jhula or Tapovan — wide (landscape) shot, river in view" },
  { key: "aarti", label: "Ganga Aarti card", want: "Evening aarti on the ghats — lamps, river, crowd" },
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]["key"];

export type Photo = { id: string; credit: string | null; w: number; h: number };

const key = (slot: PhotoSlot) => `_PHOTO_${slot.toUpperCase()}`;

export async function getPhoto(slot: PhotoSlot): Promise<Photo | null> {
  const row = (await db().prepare("SELECT value FROM settings WHERE key = ?").get(key(slot))) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value) as Photo;
  } catch {
    return null;
  }
}

/** Resizes a phone photo to a 2400px banner and a 1200px version, both WebP. */
export async function savePhoto(slot: PhotoSlot, input: Buffer, credit: string | null) {
  const id = uploadId();
  const base = sharp(input, { failOn: "error" }).rotate();
  const large = await base.clone().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 76 }).toBuffer();
  await saveFile(`${id}.webp`, large.data, "image/webp");
  await saveFile(`${id}-sm.webp`, small, "image/webp");
  const photo: Photo = { id, credit: credit?.trim() || null, w: large.info.width, h: large.info.height };
  await db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key(slot), JSON.stringify(photo));
  return photo;
}

export async function setPhotoCredit(slot: PhotoSlot, credit: string) {
  const p = await getPhoto(slot);
  if (!p) return;
  await db().prepare("UPDATE settings SET value = ? WHERE key = ?").run(JSON.stringify({ ...p, credit: credit.trim() || null }), key(slot));
}

export async function removePhoto(slot: PhotoSlot) {
  await db().prepare("DELETE FROM settings WHERE key = ?").run(key(slot));
}
