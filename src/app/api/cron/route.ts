import { runJobs } from "@/lib/cron";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return new Response("Forbidden", { status: 403 });
  return Response.json(await runJobs({ force: true }));
}
