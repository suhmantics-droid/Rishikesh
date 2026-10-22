import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, UPLOAD_DIR } from "./db";
import { uploadId } from "./util";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Normalises a phone photo of a flyer: fixes rotation, strips EXIF/GPS, makes a large and a small WebP. */
export async function saveFlyer(input: Buffer) {
  const id = uploadId();
  const base = sharp(input, { failOn: "error" }).rotate();
  const large = await base
    .clone()
    .resize({ width: 1400, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();

  await fs.writeFile(path.join(UPLOAD_DIR, `${id}.webp`), large.data);
  await fs.writeFile(path.join(UPLOAD_DIR, `${id}-sm.webp`), small);
  db().prepare("INSERT INTO uploads (id, w, h) VALUES (?, ?, ?)").run(id, large.info.width, large.info.height);
  return { id, w: large.info.width, h: large.info.height, data: large.data };
}

export async function readFlyer(id: string) {
  if (!/^[a-z0-9]{14}$/.test(id)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, `${id}.webp`));
  } catch {
    return null;
  }
}
