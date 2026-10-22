import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

// Serves uploaded flyers from the data volume. Names are random and content never changes,
// so they can be cached forever.

export async function GET(_req: Request, ctx: RouteContext<"/f/[file]">) {
  const { file } = await ctx.params;
  if (!/^[a-z0-9]{14}(-sm)?\.webp$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
