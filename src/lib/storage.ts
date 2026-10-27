// Where uploaded images live. On a server of your own: files in DATA_DIR/uploads. On Vercel (no disk
// that survives between requests): Vercel Blob, switched on by BLOB_READ_WRITE_TOKEN, which Vercel
// adds when a Blob store is connected to the project. Names look like "abc123.webp" or "originals/abc123.jpg".

import { del, get, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "./db";

const token = () => process.env.BLOB_READ_WRITE_TOKEN;

export async function saveFile(name: string, data: Buffer, contentType: string) {
  if (token()) {
    // Names are random and content never changes, so it can be cached for a year.
    await put(name, data, { access: "public", addRandomSuffix: false, allowOverwrite: true, contentType, cacheControlMaxAge: 31536000 });
    return;
  }
  const file = path.join(UPLOAD_DIR, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function readFile(name: string): Promise<Buffer | null> {
  if (token()) {
    const res = await get(name, { access: "public" }).catch(() => null);
    return res?.statusCode === 200 ? Buffer.from(await new Response(res.stream).arrayBuffer()) : null;
  }
  try {
    return await fs.readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}

export async function deleteFiles(names: string[]) {
  if (!names.length) return;
  if (token()) {
    await del(names);
    return;
  }
  await Promise.all(names.map((n) => fs.unlink(path.join(UPLOAD_DIR, n)).catch(() => {})));
}
