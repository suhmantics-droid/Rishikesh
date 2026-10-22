import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginForm, VenueEditor } from "@/components/AdminClient";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatDayLong, todayIST } from "@/lib/dates";
import { payMode } from "@/lib/payments";
import { area, rupees } from "@/lib/site";
import { flyerUrl } from "@/lib/util";
import {
  approve,
  clearDemoData,
  deleteListing,
  deleteVenue,
  extendFree,
  logout,
  publishCash,
  reject,
  resolveReport,
  runDailyJobs,
  setListingStatus,
  toggleFeatured,
} from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const TABS = [
  ["queue", "To do"],
  ["listings", "Listings"],
  ["venues", "Venues & pins"],
  ["emails", "Email log"],
] as const;

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-paper-2" />}>
        <Admin searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const btn = "rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-bold hover:border-ink-2";
const btnDark = "rounded-lg bg-ink px-2.5 py-1 text-xs font-bold text-paper";

async function Admin({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  if (!(await isAdmin())) return <LoginForm />;
  await connection(); // everything below reads the database and today's date at request time
  const sp = await searchParams;
  const tab = typeof sp.tab === "string" ? sp.tab : "queue";
  const d = db();
  const today = todayIST();

  const stats = {
    live: (d.prepare("SELECT COUNT(*) n FROM events WHERE status='live' AND live_until >= ? AND is_demo = 0").get(today) as { n: number }).n,
    revenueMonth: (d.prepare("SELECT COALESCE(SUM(amount_paise),0) n FROM payments WHERE status IN ('paid','approved') AND paid_at >= date('now','start of month')").get() as { n: number }).n,
    revenueTotal: (d.prepare("SELECT COALESCE(SUM(amount_paise),0) n FROM payments WHERE status IN ('paid','approved')").get() as { n: number }).n,
    subscribers: (d.prepare("SELECT COUNT(*) n FROM subscribers WHERE confirmed = 1").get() as { n: number }).n,
    views: (d.prepare("SELECT COALESCE(SUM(views),0) n FROM events WHERE is_demo = 0").get() as { n: number }).n,
    demo: (d.prepare("SELECT COUNT(*) n FROM events WHERE is_demo = 1").get() as { n: number }).n,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">Admin</h1>
        <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-bold">Payments: {payMode()}</span>
        <Link href="/post" className="ml-auto rounded-full bg-saffron px-4 py-2 text-sm font-bold text-white">
          + Post a flyer
        </Link>
        <form action={logout}>
          <button className={btn}>Sign out</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Live flyers", String(stats.live)],
          ["Revenue this month", rupees(stats.revenueMonth)],
          ["Revenue all time", rupees(stats.revenueTotal)],
          ["Alert subscribers", String(stats.subscribers)],
          ["Flyer views", stats.views.toLocaleString("en-IN")],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-card p-3">
            <div className="text-xs font-semibold text-muted">{l}</div>
            <div className="font-display text-2xl font-extrabold">{v}</div>
          </div>
        ))}
      </div>

      <nav className="flex gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold ${tab === k ? "border-saffron" : "border-transparent text-muted"}`}>
            {l}
          </Link>
        ))}
      </nav>

      {tab === "queue" ? <Queue today={today} /> : null}
      {tab === "listings" ? <Listings today={today} /> : null}
      {tab === "venues" ? <Venues today={today} /> : null}
      {tab === "emails" ? <Emails /> : null}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <form action={runDailyJobs}>
          <button className={btn}>Send today&apos;s digests & renewal reminders now</button>
        </form>
        {stats.demo ? (
          <form action={clearDemoData}>
            <button className={btn}>Delete {stats.demo} sample listings</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Queue({ today }: { today: string }) {
  const d = db();
  const submitted = d
    .prepare(
      `SELECT p.id AS pid, p.provider, p.upi_ref, p.purpose, p.amount_paise, p.created_at, e.id, e.title, e.flyer, e.manage_token,
              e.organiser_name, e.organiser_email, e.contact_phone
       FROM payments p JOIN events e ON e.id = p.event_id WHERE p.status = 'submitted' ORDER BY p.created_at`,
    )
    .all() as Record<string, string | number | null>[];
  const unpaid = d
    .prepare(
      `SELECT e.id, e.title, e.flyer, e.manage_token, e.organiser_email, e.created_at FROM events e
       WHERE e.status = 'pending_payment' AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.event_id = e.id AND p.status = 'submitted')
       ORDER BY e.created_at DESC LIMIT 30`,
    )
    .all() as Record<string, string | number | null>[];
  const reports = d
    .prepare("SELECT r.id, r.reason, r.created_at, e.id AS event_id, e.title, e.slug FROM reports r JOIN events e ON e.id = r.event_id WHERE r.resolved = 0 ORDER BY r.created_at")
    .all() as Record<string, string | number>[];

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-2 font-display text-xl font-extrabold">Waiting for payment confirmation ({submitted.length})</h2>
        {submitted.length === 0 ? <p className="text-sm text-muted">Nothing waiting. 🎉</p> : null}
        <ul className="grid gap-2">
          {submitted.map((r) => (
            <li key={r.pid} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3">
              {r.flyer ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={flyerUrl(String(r.flyer), "sm")!} alt="" className="h-16 w-12 rounded object-cover" />
              ) : null}
              <div className="min-w-0 flex-1 text-sm">
                <Link href={`/manage/${r.manage_token}`} className="font-bold underline">
                  {r.title}
                </Link>
                <div className="text-muted">
                  {r.provider === "cash" ? "💵 Cash" : `UPI ref ${r.upi_ref}`} · {rupees(Number(r.amount_paise))} · {r.purpose} · {String(r.organiser_name ?? "")} {String(r.organiser_email ?? "")} {String(r.contact_phone ?? "")}
                </div>
              </div>
              <form action={approve}>
                <input type="hidden" name="id" value={Number(r.pid)} />
                <button className={btnDark}>✓ Received — publish</button>
              </form>
              <form action={reject}>
                <input type="hidden" name="id" value={Number(r.pid)} />
                <input type="hidden" name="event" value={Number(r.id)} />
                <button className={btn}>Reject</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl font-extrabold">Reports ({reports.length})</h2>
        <ul className="grid gap-2">
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3 text-sm">
              <Link href={`/e/${r.slug}`} className="font-bold underline">
                {r.title}
              </Link>
              <span className="text-muted">“{r.reason}”</span>
              <form action={resolveReport} className="ml-auto flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="event" value={r.event_id} />
                <button name="hide" value="1" className={btnDark}>
                  Hide listing
                </button>
                <button className={btn}>Dismiss</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-1 font-display text-xl font-extrabold">Started but not submitted ({unpaid.length})</h2>
        <p className="mb-2 text-sm text-muted">Organisers who filled in a flyer but didn&apos;t finish. If they pay you in person, publish here.</p>
        <ul className="grid gap-2">
          {unpaid.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-3 text-sm">
              <Link href={`/manage/${r.manage_token}`} className="font-bold underline">
                {r.title}
              </Link>
              <span className="text-muted">
                {String(r.organiser_email ?? "")} · {formatDayLong(String(r.created_at).slice(0, 10), today)}
              </span>
              <form action={publishCash} className="ml-auto flex gap-2">
                <input type="hidden" name="id" value={Number(r.id)} />
                <button className={btnDark}>Cash received — publish</button>
                <button name="free" value="1" className={btn}>
                  Publish free
                </button>
              </form>
              <form action={deleteListing}>
                <input type="hidden" name="id" value={Number(r.id)} />
                <button className={btn}>Delete</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Listings({ today }: { today: string }) {
  const rows = db()
    .prepare(
      `SELECT e.id, e.slug, e.title, e.status, e.live_until, e.views, e.featured, e.is_demo, e.manage_token, v.name AS venue,
              (SELECT MIN(date) FROM event_dates WHERE event_id = e.id AND date >= @today) AS next_date
       FROM events e JOIN venues v ON v.id = e.venue_id
       WHERE e.status IN ('live','hidden','rejected')
       ORDER BY (e.status = 'live' AND e.live_until >= @today) DESC, e.updated_at DESC LIMIT 300`,
    )
    .all({ today }) as Record<string, string | number | null>[];
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>
            <th className="p-2">Flyer</th>
            <th className="p-2">Status</th>
            <th className="p-2">Next date</th>
            <th className="p-2">Views</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => {
            const live = r.status === "live" && String(r.live_until) >= today;
            return (
              <tr key={r.id}>
                <td className="p-2">
                  <Link href={`/manage/${r.manage_token}`} className="font-bold underline">
                    {r.title}
                  </Link>
                  {r.is_demo ? <span className="ml-1 text-xs text-muted">(sample)</span> : null}
                  <div className="text-xs text-muted">{r.venue}</div>
                </td>
                <td className="p-2 text-xs">
                  {live ? `Live → ${formatDayLong(String(r.live_until), today)}` : r.status === "live" ? "Expired" : r.status}
                  {r.featured ? " · ⭐ featured" : ""}
                </td>
                <td className="p-2 text-xs">{r.next_date ? formatDayLong(String(r.next_date), today) : "—"}</td>
                <td className="p-2 text-xs">{r.views}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    <form action={toggleFeatured}>
                      <input type="hidden" name="id" value={Number(r.id)} />
                      <button className={btn}>{r.featured ? "Unfeature" : "Feature"}</button>
                    </form>
                    <form action={setListingStatus}>
                      <input type="hidden" name="id" value={Number(r.id)} />
                      <input type="hidden" name="status" value={r.status === "live" ? "hidden" : "live"} />
                      <button className={btn}>{r.status === "live" ? "Hide" : "Unhide"}</button>
                    </form>
                    <form action={extendFree}>
                      <input type="hidden" name="id" value={Number(r.id)} />
                      <button className={btn}>+7 days free</button>
                    </form>
                    <form action={deleteListing}>
                      <input type="hidden" name="id" value={Number(r.id)} />
                      <button className={btn}>Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Venues({ today }: { today: string }) {
  const venues = db()
    .prepare("SELECT v.*, (SELECT COUNT(*) FROM events e WHERE e.venue_id = v.id) AS n FROM venues v ORDER BY v.coords_verified, v.name")
    .all() as (Record<string, string | number | null> & { id: number; name: string; area: string; lat: number | null; lng: number | null; address: string | null; instagram: string | null; description: string | null; coords_verified: number; n: number; slug: string })[];
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Pins marked <b>approximate</b> came from the starter list or organisers. Walk past, check the spot on Google Maps, tap the right place, save.
      </p>
      {venues.map((v) => (
        <details key={v.id} className="rounded-2xl border border-line bg-card p-3" open={false}>
          <summary className="cursor-pointer text-sm">
            <b>{v.name}</b> <span className="text-muted">· {area(v.area).label} · {v.n} listing{v.n === 1 ? "" : "s"}</span>{" "}
            {v.coords_verified ? <span className="text-ganga">✓ pin verified</span> : <span className="text-saffron-ink">approximate pin</span>}
          </summary>
          <div className="mt-3">
            <VenueEditor v={v} today={today} />
            {v.n === 0 ? (
              <form action={deleteVenue} className="mt-2">
                <input type="hidden" name="id" value={v.id} />
                <button className={btn}>Delete venue</button>
              </form>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

function Emails() {
  const rows = db().prepare("SELECT id, to_addr, subject, status, error, created_at FROM emails ORDER BY id DESC LIMIT 60").all() as Record<string, string | number | null>[];
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">
        {process.env.RESEND_API_KEY ? "Emails are sent through Resend." : "RESEND_API_KEY isn't set, so emails are only logged here, not sent."}
      </p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-card text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-x-3 p-2">
            <span className="text-muted">{String(r.created_at)}</span>
            <span className="font-semibold">{r.to_addr}</span>
            <span>{r.subject}</span>
            <span className={r.status === "failed" ? "text-red-700" : "text-muted"}>{r.status}</span>
            {r.error ? <span className="text-xs text-red-700">{String(r.error).slice(0, 120)}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
