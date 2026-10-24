import fs from "node:fs/promises";
import path from "node:path";
import { isAdmin } from "@/lib/admin";

// Thumbnails of the starter flyers for the admin page (they aren't public until published).
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/starter/[file]">) {
  if (!(await isAdmin())) return new Response("Not found", { status: 404 });
  const { file } = await ctx.params;
  if (!/^[a-z0-9-]+\.webp$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(process.cwd(), "seed", "starter", file));
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
