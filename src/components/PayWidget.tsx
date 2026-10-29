"use client";

import { useState } from "react";
import { LISTING } from "@/lib/site";

type StartResult =
  | { mode: "cash"; paymentId: number; amount: number; cash: { name: string | null; whatsapp: string | null } }
  | {
      mode: "razorpay";
      paymentId: number;
      amount: number;
      razorpay: {
        key: string;
        order_id: string;
        amount: number;
        currency: string;
        name: string;
        description: string;
        prefill: { email: string; name: string };
      };
    }
  | { mode: "upi"; paymentId: number; amount: number; upi: { vpa: string; payee: string; uri: string; qrSvg: string; ref: string } };

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(s);
  });
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

/**
 * Takes the listing fee in whichever mode the server runs (cash / UPI / Razorpay).
 * Admins skip payment entirely: they record cash received or publish free.
 */
export function PayWidget({
  token,
  purpose,
  priceLabel,
  mode,
  isAdmin,
  onDone,
}: {
  token: string;
  purpose: "new" | "renew";
  priceLabel: string;
  mode: "cash" | "upi" | "razorpay";
  isAdmin?: boolean;
  onDone: (result: "paid" | "pending") => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<StartResult | null>(null);
  const [utr, setUtr] = useState("");

  async function act(fn: () => Promise<unknown>, result: "paid" | "pending") {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onDone(result);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const p = (await post("/api/pay/start", { token, purpose })) as StartResult;
      setPay(p);
      if (p.mode === "cash") {
        await post("/api/pay/manual", { token, paymentId: p.paymentId });
        onDone("pending");
        return;
      }
      if (p.mode === "razorpay") {
        await loadRazorpay();
        const rz = new window.Razorpay!({
          ...p.razorpay,
          theme: { color: "#0b6b5e" },
          handler: (resp: Record<string, string>) => act(() => post("/api/pay/razorpay", resp), "paid"),
          modal: { ondismiss: () => setBusy(false) },
        });
        rz.on("payment.failed", () => setError("Payment failed. No money was taken. Try again or use another UPI app."));
        rz.open();
        return;
      }
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  if (isAdmin) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => post("/api/pay/comp", { token, kind: "cash" }), "paid")}
          className="min-h-[52px] w-full bg-act px-5 text-[17px] font-bold text-on-act disabled:opacity-60"
        >
          {busy ? "Publishing…" : `Checked and ${priceLabel} received: ${purpose === "renew" ? "renew" : "publish"} now`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => post("/api/pay/comp", { token, kind: "free" }), "paid")}
          className="min-h-12 w-full border-[1.5px] border-ink px-4 text-[16px] font-bold disabled:opacity-60"
        >
          {purpose === "renew" ? "Renew free" : "Publish free"} (seeding / comp)
        </button>
        <p className="text-center text-[14px] text-muted">You&apos;re signed in as admin, so there&apos;s no review step.</p>
        {error ? <ErrorText msg={error} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mode === "cash" ? <CashNote priceLabel={priceLabel} renew={purpose === "renew"} /> : null}

      {!pay || pay.mode === "razorpay" ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="min-h-[52px] w-full bg-act px-5 text-[17px] font-bold text-on-act transition hover:brightness-110 disabled:opacity-60"
        >
          {busy
            ? "One moment…"
            : mode === "cash"
              ? purpose === "renew"
                ? "Ask to renew"
                : "Send for review"
              : `Pay ${priceLabel} & ${purpose === "renew" ? "renew" : "publish"}`}
        </button>
      ) : null}

      {pay?.mode === "upi" ? (
        <div className="bg-surface p-4 shadow-e1">
          <p className="text-[17px] font-bold">Pay {priceLabel} by UPI</p>
          <p className="text-[15px] text-ink-2">Scan with GPay, PhonePe, Paytm or any UPI app.</p>
          <div className="mx-auto my-3 w-52 bg-white p-2" dangerouslySetInnerHTML={{ __html: pay.upi.qrSvg }} />
          <div className="flex flex-col gap-1 text-center text-sm">
            <span>
              UPI ID: <b className="select-all">{pay.upi.vpa}</b>
            </span>
            <span className="text-muted">Note / reference: {pay.upi.ref}</span>
            <a href={pay.upi.uri} className="mx-auto mt-2 inline-flex min-h-11 items-center rounded-full border-[1.5px] border-ink px-4 font-bold sm:hidden">
              Open my UPI app
            </a>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            After paying, enter the UPI transaction ID (12-digit UTR)
            <input
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 429876543210"
              className="mt-1 min-h-12 w-full border-[1.5px] border-line-strong bg-surface px-3 text-[16px]"
            />
          </label>
          <button
            type="button"
            disabled={busy || utr.trim().length < 6}
            onClick={() => act(() => post("/api/pay/manual", { token, paymentId: pay.paymentId, ref: utr }), "pending")}
            className="mt-3 min-h-12 w-full bg-ink px-4 font-bold text-wall disabled:opacity-50"
          >
            I&apos;ve paid: send it
          </button>
          <p className="mt-2 text-[14px] text-muted">We check UPI payments by hand, usually within a few hours. Your flyer goes live once it&apos;s confirmed.</p>
        </div>
      ) : null}

      {error ? <ErrorText msg={error} /> : null}
      {mode === "razorpay" ? <p className="text-center text-[14px] text-muted">Secure payment: UPI, cards and netbanking</p> : null}
    </div>
  );
}

function CashNote({ priceLabel, renew }: { priceLabel: string; renew: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-surface p-4 text-[16px] text-ink-2 shadow-e1">
      <p className="text-[17px] font-bold text-ink">{priceLabel} for {LISTING.days / 7} {renew ? "more " : ""}weeks on the wall</p>
      <p>{renew ? "Ask, and we'll message you on WhatsApp the same day. Pay when we renew it." : "Paid only after we've checked it. We'll tell you how on WhatsApp, the same day."} Nothing renews by itself.</p>
    </div>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return <p className="bg-warn-soft p-3 text-[16px] font-semibold text-warn-soft-ink">{msg}</p>;
}
