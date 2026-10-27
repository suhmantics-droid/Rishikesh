import { runJobs } from "@/lib/cron";
import { isGithubActionsToken } from "@/lib/github-oidc";

// Runs the scheduled jobs. Callers prove themselves one of three ways:
//  - ?key=CRON_SECRET (an outside scheduler),
//  - "Authorization: Bearer CRON_SECRET" (Vercel Cron sends this itself),
//  - "Authorization: Bearer <GitHub Actions OIDC token>" from the repo named in CRON_GITHUB_REPO
//    (.github/workflows/jobs.yml — no secret stored in GitHub).
export async function GET(req: Request) {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const key = new URL(req.url).searchParams.get("key") ?? bearer;
  const secret = process.env.CRON_SECRET;
  const repo = process.env.CRON_GITHUB_REPO;
  const allowed = (!!secret && key === secret) || (!!repo && !!bearer && (await isGithubActionsToken(bearer, repo)));
  if (!allowed) return new Response("Forbidden", { status: 403 });
  return Response.json(await runJobs({ force: true }));
}
