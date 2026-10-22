import { confirmSubscriber } from "@/lib/alerts";

// Link from the confirmation email. GET is fine: confirming is idempotent and harmless.
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (/^[A-Za-z0-9]{24}$/.test(t)) confirmSubscriber(t);
  return Response.redirect(new URL(`/alerts/${t}?confirmed=1`, req.url), 303);
}
