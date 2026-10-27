import { runJobs } from "@/lib/cron";

export async function GET(req: Request) {
  // ?key=CRON_SECRET from an outside scheduler, or "Authorization: Bearer CRON_SECRET" from Vercel Cron.
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new Response("Forbidden", { status: 403 });
  return Response.json(await runJobs({ force: true }));
}
