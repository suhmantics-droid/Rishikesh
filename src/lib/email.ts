// Sends email through Resend when RESEND_API_KEY is set; otherwise only records it.
// Every message is written to the `emails` table so /admin/outbox shows what went out.

import { config } from "./config";
import { db } from "./db";
import { SITE } from "./site";
import { escapeHtml } from "./util";

export async function sendEmail(to: string, subject: string, html: string) {
  const key = await config("RESEND_API_KEY");
  const from = (await config("EMAIL_FROM")) || `${SITE.name} ${SITE.place} <alerts@suhmantics.com>`;
  let status = "logged";
  let error: string | null = null;
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject, html }),
      });
      status = res.ok ? "sent" : "failed";
      if (!res.ok) error = (await res.text()).slice(0, 500);
    } catch (e) {
      status = "failed";
      error = String(e).slice(0, 500);
    }
  } else {
    console.log(`[email:not-sent] to=${to} subject=${subject}`);
  }
  await db().prepare("INSERT INTO emails (to_addr, subject, html, status, error) VALUES (?, ?, ?, ?, ?)").run(to, subject, html, status, error);
  return status !== "failed";
}

/** Simple, readable email shell that works in Gmail on a phone. */
export function emailLayout(title: string, body: string, footer = "") {
  return `<!doctype html><html><body style="margin:0;background:#f6f1e7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1d1b16">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="font-weight:800;font-size:20px;letter-spacing:-0.02em;margin-bottom:16px">📌 ${SITE.name} <span style="font-weight:500;color:#6b655a">${SITE.place}</span></div>
  <div style="background:#fffdf8;border:1px solid #e6dccb;border-radius:14px;padding:20px">
    <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(title)}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#6b655a;margin-top:16px">${footer}</p>
</div></body></html>`;
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#e8672a;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;margin:8px 0">${escapeHtml(label)}</a>`;
}
