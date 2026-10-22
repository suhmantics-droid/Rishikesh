import { verifyRazorpay } from "@/lib/payments";

// Razorpay Checkout calls our handler with these three values after a successful payment.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  if (!b.razorpay_order_id || !b.razorpay_payment_id || !b.razorpay_signature) {
    return Response.json({ error: "Missing payment details" }, { status: 400 });
  }
  const ok = verifyRazorpay(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "Payment could not be verified" }, { status: 400 });
}
