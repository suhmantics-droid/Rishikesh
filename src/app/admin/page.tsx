import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BatchUploader, LoginForm, PhotoUploader, VenueEditor } from "@/components/AdminClient";
import { StoryShare } from "@/components/StoryShare";
import { getPhoto, PHOTO_SLOTS } from "@/lib/photos";
import { VisitorsChart } from "@/components/VisitorsChart";
import { dailySeries } from "@/lib/stats";
import { isAdmin } from "@/lib/admin";
import { config, configSource, SETTINGS } from "@/lib/config";
import { db } from "@/lib/db";
import { formatDayLong, todayIST } from "@/lib/dates";
import { payMode } from "@/lib/payments";
import { starterStatus } from "@/lib/starter";
import { batchQueue } from "@/lib/uploads";
import { aiEnabled } from "@/lib/extract";
import { area, rupees } from "@/lib/site";
import { flyerUrl } from "@/lib/util";
import {
  approve,
  clearDemoData,
  deleteListing,
  deleteVenue,
  discardUpload,
  extendFree,
  logout,
  publishCash,
  publishStarter,
  reject,
  resolveReport,
  runDailyJobs,
  saveSettings,
  setListingStatus,
  toggleFeatured,
} from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const TABS = [
  ["queue", "To do"],
  ["listings", "Listings"],
  ["venues", "Venues & pins"],
  ["emails", "Email log"],
  ["settings", "Settings"],
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
    live: ((await d.prepare("SELECT COUNT(*) n FROM events WHERE status='live' AND live_until >= ? AND is_demo = 0").get(today)) as { n: number }).n,
    revenueMonth: ((await d.prepare("SELECT COALESCE(SUM(amount_paise),0) n FROM payments WHERE status IN ('paid','approved') AND paid_at >= date('now','start of month')").get()) as { n: number }).n,
    revenueTotal: ((await d.prepare("SELECT COALESCE(SUM(amount_paise),0) n FROM payments WHERE status IN ('paid','approved')").get()) as { n: number }).n,
    subscribers:
      ((await d.prepare("SELECT COUNT(*) n FROM subscribers WHERE confirmed = 1").get()) as { n: number }).n +
      ((await d.prepare("SELECT COUNT(*) n FROM push_subscriptions").get()) as { n: number }).n,
    views: ((await d.prepare("SELECT COALESCE(SUM(views),0) n FROM events WHERE is_demo = 0").get()) as { n: number }).n,
    demo: ((await d.prepare("SELECT COUNT(*) n FROM events WHERE is_demo = 1").get()) as { n: number }).n,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold">Admin</h1>
        <span className="rounded-full bg-paper-2 px-3 py-1 text-xs font-bold">Payments: {await payMode()}</span>
        <span className="text-xs text-muted">version {process.env.GIT_SHA || "dev"}</span>
        <Link href="/admin?tab=queue#photos" className="ml-auto rounded-full border border-line bg-card px-4 py-2 text-sm font-bold">
          📸 Add photos
        </Link>
        <Link href="/post" className="rounded-full bg-saffron px-4 py-2 text-sm font-bold text-white">
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
          ["Alert subscribers (email + phone)", String(stats.subscribers)],
          ["Flyer views", stats.views.toLocaleString("en-IN")],
        ].map(([l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-card p-3">
            <div className="text-xs font-semibold text-muted">{l}</div>
            <div className="font-display text-2xl font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <VisitorsChart data={await dailySeries(14)} today={today} />
      <TopFlyers today={today} />

      <nav className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([k, l]) => (
          <Link key={k} href={`/admin?tab=${k}`} className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-bold whitespace-nowrap ${tab === k ? "border-saffron" : "border-transparent text-muted"}`}>
            {l}
          </Link>
        ))}
      </nav>

      {tab === "queue" ? <Queue today={today} /> : null}
      {tab === "listings" ? <Listings today={today} /> : null}
      {tab === "venues" ? <Venues today={today} /> : null}
      {tab === "emails" ? <Emails /> : null}
      {tab === "settings" ? <Settings /> : null}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <a href="/api/admin/export?type=listings" className={btn}>
          Download listings (CSV)
        </a>
        <a href="/api/admin/export?type=payments" className={btn}>
          Payments (CSV)
        </a>
        <a href="/api/admin/export?type=subscribers" className={btn}>
          Email subscribers (CSV)
        </a>
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

async function Queue({ today }: { today: string }) {
  const d = db();
  const submitted = (await d
    .prepare(
      `SELECT p.id AS pid, p.provider, p.upi_ref, p.purpose, p.amount_paise, p.created_at, e.id, e.title, e.flyer, e.manage_token,
              e.organiser_name, e.organiser_email, e.contact_phone
       FROM payments p JOIN events e ON e.id = p.event_id WHERE p.status = 'submitted' ORDER BY p.created_at`,
    )
    .all()) as Record<string, string | number | null>[];
  const unpaid = (await d
    .prepare(
      `SELECT e.id, e.title, e.flyer, e.manage_token, e.organiser_email, e.created_at FROM events e
       WHERE e.status = 'pending_payment' AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.event_id = e.id AND p.status = 'submitted')
       ORDER BY e.created_at DESC LIMIT 30`,
    )
    .all()) as Record<string, string | number | null>[];
  const reports = (await d
    .prepare("SELECT r.id, r.reason, r.created_at, e.id AS event_id, e.title, e.slug FROM reports r JOIN events e ON e.id = r.event_id WHERE r.resolved = 0 ORDER BY r.created_at")
    .all()) as Record<string, string | number>[];

  const starter = (await starterStatus()).filter((s) => s.state !== "past");
  const ready = starter.filter((s) => s.state === "ready");
  const photos = await batchQueue();
  const aiOn = await aiEnabled();

  return (
    <div className="grid gap-8">
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-lg font-semibold">Post today&apos;s story</h2>
        <p className="mb-3 text-sm text-muted">A picture of the flyers for your Instagram and WhatsApp status — one a day keeps people coming back.</p>
        <div className="flex flex-wrap gap-2">
          <StoryShare label="Today" />
          <StoryShare when="tomorrow" label="Tomorrow" />
          <StoryShare when="weekend" label="Weekend" />
        </div>
      </section>
      <section id="photos" className="grid scroll-mt-20 gap-3">
        <BatchUploader />
        {photos.length ? (
          <>
            <h2 className="font-display text-xl font-semibold">Photos to post ({photos.length})</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {photos.map((p) => (
                <li key={p.id} className="flex gap-3 rounded-2xl border border-line bg-card p-2 text-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumb} alt="" loading="lazy" className="h-24 w-[4.5rem] shrink-0 rounded object-cover object-top" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {p.title ?? <span className="font-normal text-muted">{aiOn ? "Still reading…" : "Auto-fill is off — open it to fill in"}</span>}
                    </p>
                    <p className="text-muted">
                      {p.firstDate ? formatDayLong(p.firstDate, today) : p.title ? "No date read" : ""}
                      {p.links ? ` · ${p.links} QR link${p.links === 1 ? "" : "s"}` : ""}
                    </p>
                    {p.duplicates.map((d) => (
                      <p key={d.slug} className="text-xs font-semibold text-saffron-ink">
                        Already up? {d.why}:{" "}
                        <Link href={`/e/${d.slug}`} className="underline">
                          {d.title}
                        </Link>
                      </p>
                    ))}
                    {p.similarInBatch.length ? <p className="text-xs font-semibold text-saffron-ink">Looks like another photo in this batch</p> : null}
                    <div className="mt-1.5 flex gap-2">
                      <Link href={`/post?upload=${p.id}`} className={btnDark}>
                        Check &amp; post →
                      </Link>
                      <form action={discardUpload}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className={btn}>Discard</button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
      {ready.length ? (
        <section className="rounded-2xl border border-ganga/40 bg-ganga-soft/40 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-semibold">Starter flyers ({ready.length} ready)</h2>
              <p className="text-sm text-muted">Real flyers from Tapovan walls, straightened and checked. Publish them free so the board isn&apos;t empty on day one.</p>
            </div>
            {ready.length ? (
              <form action={publishStarter}>
                <button className={btnDark}>Publish all {ready.length}</button>
              </form>
            ) : null}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {starter.map((s) => (
              <li key={s.key} className="flex gap-3 rounded-xl border border-line bg-card p-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/starter/${s.image}`} alt="" loading="lazy" className="h-20 w-16 shrink-0 rounded object-cover object-top" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{s.title}</p>
                  <p className="text-muted">
                    {s.state === "ready" ? "Ready" : s.state === "imported" ? "✓ Published" : s.state === "past" ? "Already happened — skipped" : "No dates on the flyer"}
                  </p>
                  {s.note && s.state !== "past" ? <p className="mt-0.5 text-xs text-saffron-ink">{s.note}</p> : null}
                </div>
                {s.state === "ready" ? (
                  <form action={publishStarter} className="self-center">
                    <input type="hidden" name="key" value={s.key} />
                    <button className={btn}>Publish</button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="mb-2 font-display text-xl font-semibold">Waiting for payment confirmation ({submitted.length})</h2>
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
        <h2 className="mb-2 font-display text-xl font-semibold">Reports ({reports.length})</h2>
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
        <h2 className="mb-1 font-display text-xl font-semibold">Started but not submitted ({unpaid.length})</h2>
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

async function Listings({ today }: { today: string }) {
  const rows = (await db()
    .prepare(
      `SELECT e.id, e.slug, e.title, e.status, e.live_until, e.views, e.featured, e.is_demo, e.manage_token, v.name AS venue,
              (SELECT MIN(date) FROM event_dates WHERE event_id = e.id AND date >= @today) AS next_date
       FROM events e JOIN venues v ON v.id = e.venue_id
       WHERE e.status IN ('live','hidden','rejected')
       ORDER BY (e.status = 'live' AND e.live_until >= @today) DESC, e.updated_at DESC LIMIT 300`,
    )
    .all({ today })) as Record<string, string | number | null>[];
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

async function Venues({ today }: { today: string }) {
  const venues = (await db()
    .prepare("SELECT v.*, (SELECT COUNT(*) FROM events e WHERE e.venue_id = v.id) AS n FROM venues v ORDER BY v.coords_verified, v.name")
    .all()) as (Record<string, string | number | null> & { id: number; name: string; area: string; lat: number | null; lng: number | null; address: string | null; instagram: string | null; description: string | null; coords_verified: number; n: number; slug: string })[];
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
            <Link href={`/v/${v.slug}/poster`} className="mt-2 inline-block text-xs font-bold underline">
              🖨 Print their QR poster
            </Link>
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

async function Emails() {
  const rows = (await db().prepare("SELECT id, to_addr, subject, status, error, created_at FROM emails ORDER BY id DESC LIMIT 60").all()) as Record<string, string | number | null>[];
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted">
        {(await config("RESEND_API_KEY")) ? "Emails are sent through Resend." : "No Resend key yet (Settings tab), so emails are only logged here, not sent."}
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

async function Settings() {
  const groups = [...new Set(SETTINGS.map((s) => s.group))];
  const photos = new Map(await Promise.all(PHOTO_SLOTS.map(async (p) => [p.key, await getPhoto(p.key)] as const)));
  const saved = new Map(await Promise.all(SETTINGS.map(async (s) => [s.key, { source: await configSource(s.key), value: await config(s.key) }] as const)));
  const input = "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm disabled:opacity-60";
  return (
    <div className="grid max-w-2xl gap-6">
    <section className="grid gap-3">
      <h2 className="font-display text-xl font-semibold">Photos</h2>
      <p className="-mt-2 text-sm text-muted">Your own photos of Rishikesh. Until you add them, a plain placeholder shows in their place.</p>
      {PHOTO_SLOTS.map((p) => (
        <PhotoUploader key={p.key} slot={p.key} label={p.label} want={p.want} current={photos.get(p.key) ?? null} />
      ))}
    </section>
    <form action={saveSettings} className="grid gap-6">
      <p className="text-sm text-muted">
        Changes apply immediately. Secret keys are never shown again after saving — leave them blank to keep the saved value.
      </p>
      {groups.map((g) => (
        <section key={g} className="grid gap-3 rounded-2xl border border-line bg-card p-4">
          <h2 className="font-display text-lg font-semibold">{g}</h2>
          {SETTINGS.filter((s) => s.group === g).map((s) => {
            const source = saved.get(s.key)?.source ?? null;
            const secret = "secret" in s && s.secret;
            const options = "options" in s ? s.options : null;
            const current = secret ? "" : (saved.get(s.key)?.value ?? "");
            return (
              <label key={s.key} className="grid gap-1 text-sm">
                <span className="font-bold">
                  {s.label}{" "}
                  {source === "env" ? (
                    <span className="font-normal text-muted">· set on the server (.env)</span>
                  ) : secret && source === "admin" ? (
                    <span className="font-normal text-ganga">· saved ✓</span>
                  ) : null}
                </span>
                {options ? (
                  <select name={s.key} defaultValue={current || "cash"} disabled={source === "env"} className={input}>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={s.key}
                    type={secret ? "password" : "text"}
                    defaultValue={current}
                    placeholder={secret && source === "admin" ? "•••••••• (saved — type to replace)" : ""}
                    disabled={source === "env"}
                    autoComplete="off"
                    className={input}
                  />
                )}
                {s.help ? <span className="text-xs text-muted">{s.help}</span> : null}
                {secret && source === "admin" ? (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <input type="checkbox" name={`clear_${s.key}`} value="1" /> Remove saved key
                  </span>
                ) : null}
              </label>
            );
          })}
        </section>
      ))}
      <button className="justify-self-start rounded-xl bg-ink px-5 py-2.5 font-bold text-paper">Save settings</button>
    </form>
    </div>
  );
}

/** Which live flyers people actually look at and act on. */
async function TopFlyers({ today }: { today: string }) {
  const rows = (await db()
    .prepare(
      `SELECT e.id, e.title, e.manage_token, e.views,
              COALESCE(SUM(CASE WHEN s.kind = 'interested' THEN s.n END), 0) AS interested,
              COALESCE(SUM(CASE WHEN s.kind IN ('whatsapp','directions','booking','instagram','calendar','share') THEN s.n END), 0) AS taps
       FROM events e LEFT JOIN event_stats s ON s.event_id = e.id
       WHERE e.status = 'live' AND e.live_until >= ?
       GROUP BY e.id ORDER BY e.views DESC LIMIT 8`,
    )
    .all(today)) as { id: number; title: string; manage_token: string; views: number; interested: number; taps: number }[];
  if (!rows.length) return null;
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-display text-lg font-semibold">Most viewed live flyers</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="py-1">Flyer</th>
            <th className="text-right">Views</th>
            <th className="text-right">Interested</th>
            <th className="text-right">Taps</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-line">
              <td className="py-1.5">
                <Link href={`/manage/${r.manage_token}`} className="underline">
                  {r.title}
                </Link>
              </td>
              <td className="text-right">{r.views}</td>
              <td className="text-right">{r.interested}</td>
              <td className="text-right">{r.taps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-muted">Taps = WhatsApp, directions, booking, Instagram, calendar and share buttons.</p>
    </section>
  );
}
