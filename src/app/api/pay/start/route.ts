import { getEventByToken } from "@/lib/data";
import { ListingError } from "@/lib/listings";
import { startPayment } from "@/lib/payments";

export async function POST(req: Request) {
  const { token, purpose } = (await req.json().catch(() => ({}))) as { token?: string; purpose?: "new" | "renew" };
  const d = token ? await getEventByToken(token) : null;
  if (!d) return Response.json({ error: "Listing not found" }, { status: 404 });
  if (d.event.status === "rejected" || d.event.status === "hidden") {
    return Response.json({ error: "This listing was taken down. Contact us if you think that's a mistake." }, { status: 403 });
  }
  try {
    const p = await startPayment(
      { id: d.event.id, slug: d.event.slug, title: d.event.title, organiser_email: d.event.organiser_email, organiser_name: d.event.organiser_name },
      purpose === "renew" || d.isLive ? "renew" : "new",
    );
    return Response.json(p);
  } catch (e) {
    if (e instanceof ListingError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
