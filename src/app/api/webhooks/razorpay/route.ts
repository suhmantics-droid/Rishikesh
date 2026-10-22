import { handleRazorpayWebhook } from "@/lib/payments";

// Backup path: if the organiser closes the tab right after paying, Razorpay still tells us.
// Configure in Razorpay Dashboard → Webhooks: URL /api/webhooks/razorpay, events payment.captured + order.paid.
export async function POST(req: Request) {
  const raw = await req.text();
  const ok = handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"));
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Invalid signature" }, { status: 400 });
}
