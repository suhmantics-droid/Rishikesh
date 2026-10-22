import { getEventByToken } from "@/lib/data";
import { ListingError } from "@/lib/listings";
import { submitManualPayment } from "@/lib/payments";

// Cash or UPI: organiser confirms they've paid; the listing waits in the admin queue.
export async function POST(req: Request) {
  const { token, paymentId, ref } = (await req.json().catch(() => ({}))) as { token?: string; paymentId?: number; ref?: string };
  const d = token ? await getEventByToken(token) : null;
  if (!d || !paymentId) return Response.json({ error: "Listing not found" }, { status: 404 });
  try {
    submitManualPayment(paymentId, d.event.id, ref);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof ListingError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
