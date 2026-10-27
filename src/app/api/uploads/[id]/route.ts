import { uploadInfo } from "@/lib/uploads";

// An upload's image, QR links and likely duplicates — for opening a batch photo in the post form.
export async function GET(_req: Request, ctx: RouteContext<"/api/uploads/[id]">) {
  const { id } = await ctx.params;
  const info = /^[a-z0-9]{14}$/.test(id) ? (await uploadInfo(id)) : null;
  if (!info) return Response.json({ error: "Upload not found" }, { status: 404 });
  return Response.json(info);
}
