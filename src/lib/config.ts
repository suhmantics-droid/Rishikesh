// Runtime settings you can change from /admin → Settings (stored in the database), so the
// site can be run entirely from a phone. A value in the server's .env always wins.

import { db } from "./db";

export const SETTINGS = [
  { key: "OWNER_NAME", label: "Your name", help: "Shown to organisers: “WhatsApp your flyer to …”", group: "Contact" },
  { key: "OWNER_WHATSAPP", label: "Your WhatsApp number", help: "With country code, e.g. +919876543210", group: "Contact" },
  {
    key: "PAYMENTS_MODE",
    label: "Payment mode",
    help: "cash, upi or razorpay",
    group: "Payments",
    options: ["cash", "upi", "razorpay"],
  },
  { key: "UPI_ID", label: "UPI ID", help: "For upi mode, e.g. yourname@okaxis", group: "Payments" },
  { key: "UPI_PAYEE_NAME", label: "UPI payee name", help: "Name shown in the payer's UPI app", group: "Payments" },
  { key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", help: "Razorpay Dashboard → API Keys", group: "Payments" },
  { key: "RAZORPAY_KEY_SECRET", label: "Razorpay key secret", help: "", group: "Payments", secret: true },
  { key: "RAZORPAY_WEBHOOK_SECRET", label: "Razorpay webhook secret", help: "Webhook URL: /api/webhooks/razorpay", group: "Payments", secret: true },
  {
    key: "ANTHROPIC_API_KEY",
    label: "Claude API key (flyer auto-fill)",
    help: "console.anthropic.com → API keys. About ₹1–2 per flyer read.",
    group: "Flyer auto-fill",
    secret: true,
  },
  { key: "RESEND_API_KEY", label: "Resend API key (email)", help: "resend.com → API keys, after verifying your domain", group: "Email", secret: true },
  { key: "EMAIL_FROM", label: "Send emails from", help: "e.g. Pinned Rishikesh <alerts@suhmantics.com>", group: "Email" },
] as const;

export type SettingKey = (typeof SETTINGS)[number]["key"];

export async function config(key: SettingKey): Promise<string | undefined> {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  const row = (await db().prepare("SELECT value FROM settings WHERE key = ?").get(key)) as { value: string } | undefined;
  return row?.value || undefined;
}

export async function configSource(key: SettingKey): Promise<"env" | "admin" | null> {
  if (process.env[key]) return "env";
  return (await db().prepare("SELECT 1 FROM settings WHERE key = ? AND value != ''").get(key)) ? "admin" : null;
}

export async function setConfig(key: SettingKey, value: string) {
  if (value) await db().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
  else await db().prepare("DELETE FROM settings WHERE key = ?").run(key);
}
