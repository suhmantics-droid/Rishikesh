// Site photographs (not flyers): the home banner and the Ganga Aarti card. Uploaded by the
// admin from a phone; until then the page shows a labelled placeholder in the river colours.

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, UPLOAD_DIR } from "./db";
import { uploadId } from "./util";

export const PHOTO_SLOTS = [
  { key: "hero", label: "Home banner", want: "The Ganga at Laxman Jhula or Tapovan — wide (landscape) shot, river in view" },
  { key: "aarti", label: "Ganga Aarti card", want: "Evening aarti on the ghats — lamps, river, crowd" },
] as const;
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]["key"];

export type Photo = { id: string; credit: string | null; w: number; h: number };

const key = (slot: PhotoSlot) => `_PHOTO_${slot.toUpperCase()}`;

export function getPhoto(slot: PhotoSlot): Photo | null {
  const row = db().prepare("SELECT value FROM settings WHERE key = ?").get(key(slot)) as { value: string } | undefined;
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
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, `${id}.webp`), large.data);
  await fs.writeFile(path.join(UPLOAD_DIR, `${id}-sm.webp`), small);
  const photo: Photo = { id, credit: credit?.trim() || null, w: large.info.width, h: large.info.height };
  db().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key(slot), JSON.stringify(photo));
  return photo;
}

export function setPhotoCredit(slot: PhotoSlot, credit: string) {
  const p = getPhoto(slot);
  if (!p) return;
  db().prepare("UPDATE settings SET value = ? WHERE key = ?").run(JSON.stringify({ ...p, credit: credit.trim() || null }), key(slot));
}

export function removePhoto(slot: PhotoSlot) {
  db().prepare("DELETE FROM settings WHERE key = ?").run(key(slot));
}
