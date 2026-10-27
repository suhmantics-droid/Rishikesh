import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { db, UPLOAD_DIR } from "./db";
import { uploadId } from "./util";

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

const ORIGINALS_DIR = () => path.join(UPLOAD_DIR, "originals");

/**
 * 256-bit difference hash: shrink to 17×16 greys (via a smooth 128×128 step, so re-saved or resized
 * copies come out the same) and record whether each pixel is brighter than its right-hand neighbour.
 * Copies of one flyer land within ~10 bits; different flyers are 29+ apart.
 */
export async function differenceHash(input: Buffer): Promise<string> {
  const mid = await sharp(input).rotate().greyscale().resize(128, 128, { fit: "fill", kernel: "cubic" }).raw().toBuffer();
  const px = await sharp(mid, { raw: { width: 128, height: 128, channels: 1 } }).resize(17, 16, { fit: "fill", kernel: "cubic" }).raw().toBuffer();
  let hex = "";
  let nibble = 0;
  let n = 0;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      nibble = (nibble << 1) | (px[y * 17 + x] > px[y * 17 + x + 1] ? 1 : 0);
      if (++n % 4 === 0) {
        hex += nibble.toString(16);
        nibble = 0;
      }
    }
  }
  return hex;
}

/** Bits that differ between two hashes; Infinity if they weren't made the same way. */
export function hashDistance(a: string, b: string) {
  if (a.length !== b.length) return Infinity;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      n += x & 1;
      x >>= 1;
    }
  }
  return n;
}

/** Hashes at most this far apart are the same flyer. */
export const SAME_FLYER = 20;

/** Normalises a phone photo of a flyer: fixes rotation, strips EXIF/GPS, makes a large and a small WebP. */
export async function saveFlyer(input: Buffer, { keepOriginal = false, batch = false, parent = null as string | null } = {}) {
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
  db()
    .prepare("INSERT INTO uploads (id, w, h, phash, batch, parent) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, large.info.width, large.info.height, await differenceHash(large.data), batch ? 1 : 0, parent);
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
