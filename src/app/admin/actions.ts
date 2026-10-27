"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin";
import { configSource, setConfig, SETTINGS } from "@/lib/config";
import { runJobs } from "@/lib/cron";
import { db } from "@/lib/db";
import { addDays, todayIST } from "@/lib/dates";
import { setStatus } from "@/lib/listings";
import { adminPublish, approvePayment, rejectPayment } from "@/lib/payments";
import { AREAS, LISTING } from "@/lib/site";
import { importStarter } from "@/lib/starter";
import { dismissUpload } from "@/lib/uploads";

async function guard() {
  if (!(await isAdmin())) throw new Error("Not signed in");
}
const id = (f: FormData, k = "id") => Number(f.get(k));

export async function login(_prev: string | null, form: FormData) {
  if (!checkPassword(String(form.get("password") ?? ""))) return "Wrong password";
  await setAdminCookie();
  redirect("/admin");
}

export async function logout() {
  await clearAdminCookie();
  redirect("/");
}

export async function approve(form: FormData) {
  await guard();
  approvePayment(id(form));
  refresh();
}

export async function reject(form: FormData) {
  await guard();
  rejectPayment(id(form));
  setStatus(id(form, "event"), "rejected");
  refresh();
}

export async function publishCash(form: FormData) {
  await guard();
  adminPublish(id(form), form.get("free") ? 0 : LISTING.pricePaise);
  refresh();
}

export async function setListingStatus(form: FormData) {
  await guard();
  const s = String(form.get("status"));
  if (s === "live" || s === "hidden") setStatus(id(form), s);
  refresh();
}

export async function toggleFeatured(form: FormData) {
  await guard();
  db().prepare("UPDATE events SET featured = 1 - featured WHERE id = ?").run(id(form));
  refresh();
}

export async function extendFree(form: FormData) {
  await guard();
  const e = db().prepare("SELECT live_until FROM events WHERE id = ?").get(id(form)) as { live_until: string | null } | undefined;
  const today = todayIST();
  const base = e?.live_until && e.live_until >= today ? e.live_until : today;
  db().prepare("UPDATE events SET live_until = ?, status = 'live' WHERE id = ?").run(addDays(base, 7), id(form));
  refresh();
}

export async function deleteListing(form: FormData) {
  await guard();
  db().prepare("DELETE FROM events WHERE id = ?").run(id(form));
  refresh();
}

export async function resolveReport(form: FormData) {
  await guard();
  db().prepare("UPDATE reports SET resolved = 1 WHERE id = ?").run(id(form));
  if (form.get("hide")) setStatus(id(form, "event"), "hidden");
  refresh();
}

export async function saveVenue(form: FormData) {
  await guard();
  const area = String(form.get("area"));
  // An empty field means "no pin", not 0,0.
  const coord = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v ? Number(v) : NaN;
  };
  const lat = coord("lat");
  const lng = coord("lng");
  db()
    .prepare(
      `UPDATE venues SET name = ?, area = ?, lat = ?, lng = ?, coords_verified = 1, address = ?, instagram = ?, description = ? WHERE id = ?`,
    )
    .run(
      String(form.get("name")).trim(),
      AREAS.some((a) => a.key === area) ? area : "other",
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
      String(form.get("address") ?? "").trim() || null,
      String(form.get("instagram") ?? "").trim().replace(/^@/, "") || null,
      String(form.get("description") ?? "").trim() || null,
      id(form),
    );
  refresh();
}

export async function deleteVenue(form: FormData) {
  await guard();
  const used = db().prepare("SELECT 1 FROM events WHERE venue_id = ? LIMIT 1").get(id(form));
  if (!used) db().prepare("DELETE FROM venues WHERE id = ?").run(id(form));
  refresh();
}

export async function saveSettings(form: FormData) {
  await guard();
  for (const s of SETTINGS) {
    if (configSource(s.key) === "env") continue; // .env wins; nothing to save
    const raw = form.get(s.key);
    if (raw === null) continue;
    const value = String(raw).trim();
    const isSecret = "secret" in s && s.secret;
    if (isSecret && !value && !form.get(`clear_${s.key}`)) continue; // blank = keep the saved secret
    setConfig(s.key, value);
  }
  refresh();
}

export async function runDailyJobs() {
  await guard();
  await runJobs({ force: true });
  refresh();
}

export async function clearDemoData() {
  await guard();
  const d = db();
  d.prepare("DELETE FROM events WHERE is_demo = 1").run();
  d.prepare("DELETE FROM venues WHERE is_demo = 1 AND id NOT IN (SELECT venue_id FROM events)").run();
  d.prepare("DELETE FROM artists WHERE id NOT IN (SELECT artist_id FROM event_artists)").run();
  refresh();
}

export async function publishStarter(form: FormData) {
  await guard();
  const key = form.get("key");
  const { failed } = await importStarter(typeof key === "string" && key ? [key] : undefined);
  for (const f of failed) console.error(`starter flyer "${f.title}" not published: ${f.reason}`);
  refresh();
}

export async function discardUpload(form: FormData) {
  await guard();
  dismissUpload(String(form.get("id")));
  refresh();
}
