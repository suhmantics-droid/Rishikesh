import { isAdmin } from "@/lib/admin";
import { getEventByToken } from "@/lib/data";
import { adminPublish } from "@/lib/payments";
import { LISTING } from "@/lib/site";

// Admin publishes directly: "cash" records ₹50 received in person, "free" records ₹0.
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Admins only" }, { status: 403 });
  const { token, kind } = (await req.json().catch(() => ({}))) as { token?: string; kind?: "cash" | "free" };
  const d = token ? await getEventByToken(token) : null;
  if (!d) return Response.json({ error: "Listing not found" }, { status: 404 });
  adminPublish(d.event.id, kind === "cash" ? LISTING.pricePaise : 0);
  return Response.json({ ok: true });
}
