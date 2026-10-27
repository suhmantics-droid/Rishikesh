import { aiEnabled } from "@/lib/extract";
import { extractUpload } from "@/lib/uploads";
import { clientIp, rateLimit } from "@/lib/util";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { uploadId } = (await req.json().catch(() => ({}))) as { uploadId?: string };
  if (!uploadId) return Response.json({ error: "Missing upload" }, { status: 400 });
  if (aiEnabled() && !rateLimit(`extract:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ fields: null, reason: "Auto-fill limit reached for now — fill in the details below." });
  }
  const result = await extractUpload(uploadId);
  if (result.error) return Response.json({ error: result.error }, { status: 404 });
  return Response.json(result);
}
