// ₹50 listing payments. Three modes; PAYMENTS_MODE picks one, otherwise it's inferred from env:
//  - cash:     (launch default) organiser submits, pays you in person, you tap "Approve" in /admin.
//              Admins can also post flyers themselves and record the cash in one tap.
//  - upi:      no gateway. Show a UPI QR for your own UPI ID; organiser enters the UTR and
//              you approve it in /admin. Zero fees.
//  - razorpay: UPI / cards / netbanking via Razorpay Checkout, verified by signature + webhook.
//              Goes live instantly with no manual step.

import crypto from "node:crypto";
import QRCode from "qrcode";
import { db } from "./db";
import { ListingError, publishOrRenew } from "./listings";
import { onPublished } from "./alerts";
import { LISTING, SITE } from "./site";

export type PayMode = "razorpay" | "upi" | "cash";

export function payMode(): PayMode {
  const forced = process.env.PAYMENTS_MODE;
  if (forced === "razorpay" || forced === "upi" || forced === "cash") return forced;
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) return "razorpay";
  if (process.env.UPI_ID) return "upi";
  return "cash";
}

/** Who organisers should contact to pay or send flyers (shown in cash/UPI mode). */
export function ownerContact() {
  return { name: process.env.OWNER_NAME || null, whatsapp: process.env.OWNER_WHATSAPP || null };
}

type EventForPay = { id: number; slug: string; title: string; organiser_email: string | null; organiser_name: string | null };

export async function startPayment(event: EventForPay, purpose: "new" | "renew") {
  const mode = payMode();
  const amount = LISTING.pricePaise;
  const ins = db()
    .prepare("INSERT INTO payments (event_id, provider, purpose, amount_paise) VALUES (?, ?, ?, ?)")
    .run(event.id, mode, purpose, amount);
  const paymentId = Number(ins.lastInsertRowid);
  const ref = `PIN${paymentId}`;

  if (mode === "razorpay") {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR", receipt: ref, notes: { event_id: String(event.id), purpose } }),
    });
    if (!res.ok) throw new ListingError(`Could not start payment (${res.status}).`);
    const order = (await res.json()) as { id: string };
    db().prepare("UPDATE payments SET order_id = ? WHERE id = ?").run(order.id, paymentId);
    return {
      mode,
      paymentId,
      amount,
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID!,
        order_id: order.id,
        amount,
        currency: "INR",
        name: `${SITE.name} ${SITE.place}`,
        description: `${LISTING.days}-day flyer listing: ${event.title}`.slice(0, 250),
        prefill: { email: event.organiser_email ?? "", name: event.organiser_name ?? "" },
      },
    };
  }

  if (mode === "cash") {
    return { mode, paymentId, amount, cash: ownerContact() };
  }

  if (mode === "upi") {
    const vpa = process.env.UPI_ID!;
    const payee = process.env.UPI_PAYEE_NAME || `${SITE.name} ${SITE.place}`;
    const uri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payee)}&am=${(amount / 100).toFixed(2)}&cu=INR&tn=${encodeURIComponent(ref)}`;
    const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1, width: 220 });
    return { mode, paymentId, amount, upi: { vpa, payee, uri, qrSvg, ref } };
  }

  return { mode, paymentId, amount };
}

function markPaid(paymentId: number, fields: { payment_id?: string; status?: "paid" | "approved" } = {}) {
  const d = db();
  const p = d.prepare("SELECT * FROM payments WHERE id = ?").get(paymentId) as
    | { id: number; event_id: number; status: string }
    | undefined;
  if (!p) throw new ListingError("Payment not found");
  if (p.status === "paid" || p.status === "approved") return null; // idempotent: webhook + client both report
  d.prepare("UPDATE payments SET status = ?, payment_id = COALESCE(?, payment_id), paid_at = datetime('now') WHERE id = ?").run(
    fields.status ?? "paid",
    fields.payment_id ?? null,
    paymentId,
  );
  const result = publishOrRenew(p.event_id);
  onPublished(p.event_id, result.firstPublish);
  return result;
}

export function verifyRazorpay(orderId: string, razorpayPaymentId: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${orderId}|${razorpayPaymentId}`)
    .digest("hex");
  if (!safeEqual(expected, signature)) return false;
  const p = db().prepare("SELECT id FROM payments WHERE order_id = ?").get(orderId) as { id: number } | undefined;
  if (!p) return false;
  markPaid(p.id, { payment_id: razorpayPaymentId });
  return true;
}

export function handleRazorpayWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeEqual(expected, signature)) return false;
  const body = JSON.parse(rawBody) as {
    event: string;
    payload?: { payment?: { entity?: { id: string; order_id: string } }; order?: { entity?: { id: string } } };
  };
  if (body.event === "payment.captured" || body.event === "order.paid") {
    const orderId = body.payload?.payment?.entity?.order_id ?? body.payload?.order?.entity?.id;
    const p = orderId ? (db().prepare("SELECT id FROM payments WHERE order_id = ?").get(orderId) as { id: number } | undefined) : undefined;
    if (p) markPaid(p.id, { payment_id: body.payload?.payment?.entity?.id });
  }
  return true;
}

/** Cash or UPI: the organiser says they've paid (UPI adds the UTR); an admin confirms in /admin. */
export function submitManualPayment(paymentId: number, eventId: number, ref?: string) {
  const p = db().prepare("SELECT provider FROM payments WHERE id = ? AND event_id = ?").get(paymentId, eventId) as { provider: string } | undefined;
  if (!p || (p.provider !== "upi" && p.provider !== "cash")) throw new ListingError("Payment not found.");
  const clean = (ref ?? "").replace(/\s+/g, "").slice(0, 40);
  if (p.provider === "upi" && clean.length < 6) throw new ListingError("Enter the UPI transaction ID (UTR) from your payment app.");
  db()
    .prepare("UPDATE payments SET upi_ref = ?, status = 'submitted' WHERE id = ? AND status IN ('created','submitted')")
    .run(clean || null, paymentId);
  db().prepare("UPDATE events SET status = 'pending_review' WHERE id = ? AND status = 'pending_payment'").run(eventId);
}

export function approvePayment(paymentId: number) {
  return markPaid(paymentId, { status: "approved" });
}

export function rejectPayment(paymentId: number) {
  db().prepare("UPDATE payments SET status = 'rejected' WHERE id = ?").run(paymentId);
}

/**
 * Admin publishes directly: you were handed cash (amountPaise = listing price) or you're
 * seeding the board / comping a venue (amountPaise = 0). Renews if already live.
 */
export function adminPublish(eventId: number, amountPaise: number) {
  const e = db().prepare("SELECT status, live_until FROM events WHERE id = ?").get(eventId) as { status: string; live_until: string | null } | undefined;
  if (!e) throw new ListingError("Listing not found");
  const ins = db()
    .prepare("INSERT INTO payments (event_id, provider, purpose, amount_paise) VALUES (?, ?, ?, ?)")
    .run(eventId, amountPaise > 0 ? "cash" : "admin", e.status === "live" ? "renew" : "new", amountPaise);
  return markPaid(Number(ins.lastInsertRowid), { status: "approved" });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
