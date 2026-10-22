import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

// CSV downloads for your own records: listings, payments and email subscribers.
const QUERIES: Record<string, string> = {
  listings: `SELECT e.id, e.title, e.category, v.name AS venue, e.status, e.live_until, e.views, e.featured, e.organiser_name,
                    e.organiser_email, e.contact_phone, e.created_at, e.published_at,
                    (SELECT MIN(date) FROM event_dates d WHERE d.event_id = e.id) AS first_date,
                    (SELECT MAX(date) FROM event_dates d WHERE d.event_id = e.id) AS last_date
             FROM events e JOIN venues v ON v.id = e.venue_id WHERE e.is_demo = 0 ORDER BY e.created_at DESC`,
  payments: `SELECT p.id, p.created_at, p.paid_at, p.provider, p.purpose, p.amount_paise / 100.0 AS amount_rupees, p.status,
                    p.upi_ref, p.payment_id, e.title AS listing
             FROM payments p JOIN events e ON e.id = p.event_id WHERE e.is_demo = 0 ORDER BY p.created_at DESC`,
  subscribers: `SELECT s.email, s.confirmed, s.daily_digest, s.created_at,
                       (SELECT group_concat(kind || ':' || target, ' ') FROM follows f WHERE f.subscriber_id = s.id) AS follows
                FROM subscribers s ORDER BY s.created_at DESC`,
};

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Admins only", { status: 403 });
  const type = new URL(req.url).searchParams.get("type") ?? "";
  const sql = QUERIES[type];
  if (!sql) return new Response("Unknown export", { status: 400 });
  const body = csv(db().prepare(sql).all() as Record<string, unknown>[]);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pinned-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
