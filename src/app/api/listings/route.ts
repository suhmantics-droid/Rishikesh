import { isAdmin } from "@/lib/admin";
import { createListing, ListingError, ListingInput } from "@/lib/listings";
import { clientIp, rateLimit } from "@/lib/util";

export async function POST(req: Request) {
  if (!rateLimit(`listing:${clientIp(req)}`, 20, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many listings from this connection — try again later." }, { status: 429 });
  }
  const parsed = ListingInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json({ error: `Check "${issue.path.join(".") || "form"}": ${issue.message}` }, { status: 400 });
  }
  if (!parsed.data.organiser_email && !(await isAdmin())) {
    return Response.json({ error: "Add your email — we send your private edit link there." }, { status: 400 });
  }
  try {
    const { slug, manageToken } = await createListing(parsed.data);
    return Response.json({ slug, manageToken });
  } catch (e) {
    if (e instanceof ListingError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
