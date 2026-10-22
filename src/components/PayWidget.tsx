"use client";

import { useState } from "react";

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
          theme: { color: "#e8672a" },
          handler: (resp: Record<string, string>) => act(() => post("/api/pay/razorpay", resp), "paid"),
          modal: { ondismiss: () => setBusy(false) },
        });
        rz.on("payment.failed", () => setError("Payment failed — no money was taken. Try again or use another UPI app."));
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
          className="w-full rounded-2xl bg-saffron px-5 py-4 text-lg font-extrabold text-white shadow-card disabled:opacity-60"
        >
          {busy ? "Publishing…" : `Cash received (${priceLabel}) — ${purpose === "renew" ? "renew" : "publish"} now`}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act(() => post("/api/pay/comp", { token, kind: "free" }), "paid")}
          className="w-full rounded-xl border border-ink px-4 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {purpose === "renew" ? "Renew free" : "Publish free"} (seeding / comp)
        </button>
        <p className="text-center text-xs text-muted">You&apos;re signed in as admin, so no payment step.</p>
        {error ? <ErrorText msg={error} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {mode === "cash" ? <CashNote priceLabel={priceLabel} /> : null}

      {!pay || pay.mode === "razorpay" ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="w-full rounded-2xl bg-saffron px-5 py-4 text-lg font-extrabold text-white shadow-card transition hover:brightness-105 disabled:opacity-60"
        >
          {busy
            ? "One moment…"
            : mode === "cash"
              ? `Submit — I'll pay ${priceLabel} cash`
              : `Pay ${priceLabel} & ${purpose === "renew" ? "renew" : "publish"}`}
        </button>
      ) : null}

      {pay?.mode === "upi" ? (
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="font-bold">Pay {priceLabel} by UPI</p>
          <p className="text-sm text-muted">Scan with GPay, PhonePe, Paytm or any UPI app.</p>
          <div className="mx-auto my-3 w-52 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: pay.upi.qrSvg }} />
          <div className="flex flex-col gap-1 text-center text-sm">
            <span>
              UPI ID: <b className="select-all">{pay.upi.vpa}</b>
            </span>
            <span className="text-muted">Note / reference: {pay.upi.ref}</span>
            <a href={pay.upi.uri} className="mx-auto mt-2 rounded-full border border-line px-4 py-2 font-bold sm:hidden">
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
              className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2.5"
            />
          </label>
          <button
            type="button"
            disabled={busy || utr.trim().length < 6}
            onClick={() => act(() => post("/api/pay/manual", { token, paymentId: pay.paymentId, ref: utr }), "pending")}
            className="mt-3 w-full rounded-xl bg-ink px-4 py-3 font-bold text-paper disabled:opacity-50"
          >
            I&apos;ve paid — submit
          </button>
          <p className="mt-2 text-xs text-muted">We check UPI payments by hand, usually within a few hours. Your flyer goes live as soon as it&apos;s confirmed.</p>
        </div>
      ) : null}

      {error ? <ErrorText msg={error} /> : null}
      {mode === "razorpay" ? <p className="text-center text-xs text-muted">Secure payment · UPI, cards & netbanking</p> : null}
    </div>
  );
}

function CashNote({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 text-sm text-ink-2">
      <p className="font-bold text-ink">Pay {priceLabel} in cash</p>
      <p className="mt-1">Submit now and we&apos;ll be in touch to collect it. Your flyer goes live as soon as we&apos;ve received it — usually the same day.</p>
    </div>
  );
}

function ErrorText({ msg }: { msg: string }) {
  return <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-200">{msg}</p>;
}
