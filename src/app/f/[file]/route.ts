import { readFile } from "@/lib/storage";

// Serves uploaded flyers (from the data volume, or Vercel Blob). Names are random and content never
// changes, so they can be cached forever — by the browser and by the CDN in front of the site.

export async function GET(_req: Request, ctx: RouteContext<"/f/[file]">) {
  const { file } = await ctx.params;
  if (!/^[a-z0-9]{14}(-sm)?\.webp$/.test(file)) return new Response("Not found", { status: 404 });
  const data = await readFile(file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
