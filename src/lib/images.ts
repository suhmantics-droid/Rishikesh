import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, UPLOAD_DIR } from "./db";
import { uploadId } from "./util";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const ORIGINALS_DIR = () => path.join(UPLOAD_DIR, "originals");

/** Normalises a phone photo of a flyer: fixes rotation, strips EXIF/GPS, makes a large and a small WebP. */
export async function saveFlyer(input: Buffer, { keepOriginal = false } = {}) {
  const id = uploadId();
  const base = sharp(input, { failOn: "error" }).rotate();
  const large = await base
    .clone()
    .resize({ width: 1400, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  const small = await base.clone().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 74 }).toBuffer();

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, `${id}.webp`), large.data);
  await fs.writeFile(path.join(UPLOAD_DIR, `${id}-sm.webp`), small);
  db().prepare("INSERT INTO uploads (id, w, h) VALUES (?, ?, ?)").run(id, large.info.width, large.info.height);
  if (keepOriginal) {
    // A sharper copy to straighten from, kept for a few days (EXIF and location are stripped here too).
    await fs.mkdir(ORIGINALS_DIR(), { recursive: true });
    const orig = await base.clone().resize({ width: 3200, height: 3200, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    await fs.writeFile(path.join(ORIGINALS_DIR(), `${id}.jpg`), orig);
  }
  return { id, w: large.info.width, h: large.info.height, data: large.data };
}

/** The best copy we have of an upload: the kept original, or the published-size WebP. */
export async function readBestCopy(id: string) {
  if (!/^[a-z0-9]{14}$/.test(id)) return null;
  try {
    return await fs.readFile(path.join(ORIGINALS_DIR(), `${id}.jpg`));
  } catch {
    return readFlyer(id);
  }
}

/** Deletes kept originals older than `days`. */
export async function pruneOriginals(days = 3) {
  const dir = ORIGINALS_DIR();
  const cutoff = Date.now() - days * 86_400_000;
  let removed = 0;
  for (const f of await fs.readdir(dir).catch(() => [] as string[])) {
    const p = path.join(dir, f);
    const st = await fs.stat(p).catch(() => null);
    if (st && st.mtimeMs < cutoff) {
      await fs.unlink(p).catch(() => {});
      removed++;
    }
  }
  return removed;
}

export async function readFlyer(id: string) {
  if (!/^[a-z0-9]{14}$/.test(id)) return null;
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, `${id}.webp`));
  } catch {
    return null;
  }
}
