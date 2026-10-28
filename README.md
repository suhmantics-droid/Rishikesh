# Pinned · Rishikesh

**Every flyer in Tapovan, on one map.** A website where organisers pin their event flyers (₹50 for 4 weeks), and
travellers filter what's on by date, vibe, price and area, see it on a map, and get alerts for the musicians,
cafes and kinds of events they love.

Built for **rishikesh.suhmantics.com**.

| For visitors | For organisers | For you (admin) |
| --- | --- | --- |
| Flyer wall, day-by-day agenda, and a **flyer map**: every flyer pinned where it's happening | Snap a flyer → details are read from the photo (optional AI); straighten a wall photo in one drag | Post flyers yourself and record cash in one tap |
| Filter: today / tomorrow / weekend / date, category, area, price, time of day | ₹50 = 4 weeks; recurring events show on every date | Approve organiser submissions once they've paid |
| Follow artists, venues, vibes → **phone notifications** or email | Private link to edit, renew, and see views, "interested", WhatsApp and directions taps | Visitors per day, most-viewed flyers, revenue |
| **/today** — the day's list, shareable to WhatsApp with a picture preview | Followers are notified the moment the flyer goes live | Fix map pins, feature/hide listings, handle reports |
| Ganga Aarti times and directions; add to calendar; directions | Listed in Google's event results | Upload the site's photos; CSV exports |
| Class timetables (Tapashala, Divine Circle…) by day, kept apart from one-off events | Post a whole weekly timetable as one listing | **Starter pack:** 12 real Tapovan flyers ready to publish |
| QR codes on flyers become tappable buttons (WhatsApp group, booking form, map pin) | QR codes are read automatically | **Batch upload:** snap a whole wall, post them one by one later |
| **Near me** (walking minutes), **On now / in 25 min** badges | A QR poster for their own wall | **Story image** of today's flyers for Instagram / WhatsApp status |
| **My plan**: save flyers (no account), reminder an hour before | | Duplicate warnings; fix pins by pasting a Google Maps link |

---

## Going live on rishikesh.suhmantics.com — all from a browser

The site runs on **Vercel's free plan**: Vercel runs the app, **Turso** (free) holds the database, and **Vercel
Blob** holds the flyer photos. Every push to `main` on GitHub deploys itself; your data lives in Turso and Blob, so
deploys never touch it. (Prefer one server of your own? See the folded section below.)

### 1. The Vercel project
In Vercel: *Add New → Project* → import `github.com/suhmantics-droid/rishikesh`. Then, in the project:

- **Storage → Create → Blob**, and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` for you.
- **A Turso database** (<https://turso.tech>, free): create one in **AWS us-east-1** (next to the app's functions,
  which run in Vercel's `iad1`), and copy its URL and a token.
- **Settings → Environment Variables** (Production):

| Name | Value |
| --- | --- |
| `ADMIN_PASSWORD` | your password for /admin — make it long |
| `SESSION_SECRET` | any long random string (signs the admin login) |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | from Turso |
| `CRON_SECRET` | any long random string — Vercel's daily cron sends it to `/api/cron` |
| `CRON_GITHUB_REPO` | `suhmantics-droid/rishikesh` — lets the 15-minute GitHub job run the site's jobs |
| `SITE_URL` | `https://rishikesh.suhmantics.com` once the domain is connected (until then the Vercel address is used) |

Redeploy after changing variables (*Deployments → ⋯ → Redeploy*).

### 2. Connect rishikesh.suhmantics.com
Vercel → project → *Settings → Domains* → add `rishikesh.suhmantics.com`. Vercel shows the DNS record to add
(a `CNAME` named `rishikesh`); add exactly that wherever suhmantics.com's DNS is managed. On Cloudflare, set it
to **DNS only** (grey cloud). HTTPS is set up automatically. Then set `SITE_URL` (above) and redeploy, so links in
emails, share previews and QR posters use the real address. For GitHub's 15-minute job, also set a repository
**variable** `SITE_URL` (GitHub → repo → *Settings → Secrets and variables → Actions → Variables*) if the site
isn't at rishikesh.suhmantics.com.

### 3. Set it up from your phone
1. Open **/admin** and sign in with your `ADMIN_PASSWORD`.
2. **Settings tab → Photos:** upload your own photos — the home banner (the Ganga at Laxman Jhula or Tapovan,
   landscape) and the Ganga Aarti card. Until then a plain placeholder shows in their place. These photos are the
   first thing people see, so make them good ones.
3. **Settings tab:** your name and WhatsApp number (shown to organisers), and later your Claude, Resend, UPI or
   Razorpay keys. Everything here takes effect immediately.
4. **Seed the board before you share the link.** Admin → **To do** shows the *starter flyers* (the real
   flyers photographed in October 2026, already straightened and typed up) — tap **Publish all**. Ones that
   have already happened are skipped. Then walk Tapovan, and for each flyer on a cafe wall:
   **Post a flyer** → photo → **✂️ Straighten & crop** → check details → **Publish free**. Twenty or thirty
   flyers make it feel alive.
5. **Venues & pins tab:** fix any pin that's off — paste the place's Google Maps link (*Share → Copy link*). Until a
   pin is checked, Directions searches Google Maps by the venue's name.
6. Print **/poster** for cafe and hostel noticeboards — the QR code brings travellers in.
7. Offer organisers their first month free; then ₹50 cash.

<details>
<summary>Your own server instead (Oracle Cloud's free server, or any Ubuntu VPS)</summary>

The same code runs as one Docker container plus [Caddy](https://caddyserver.com) for HTTPS, with the database
(SQLite) and photos on the server's disk — leave the Turso and Blob variables empty. The server installs itself
from a script pasted into a web form and pulls new code from GitHub every 15 minutes.

#### 1. Code on GitHub
The code lives at `github.com/suhmantics-droid/rishikesh`. If the repo is **private**, create a read-only token
for the server: GitHub → Settings → Developer settings → *Fine-grained tokens* → *Generate* → Repository access:
only `rishikesh` → Permissions: *Contents: Read-only*. Copy the token. (A **public** repo needs no token — the
code contains no passwords or keys.)

#### 2. A free server (Oracle Cloud "Always Free")
1. Sign up at <https://www.oracle.com/cloud/free/> (needs a card for an identity check; Always Free resources
   aren't charged). Choose **India West (Mumbai)** as your home region — it can't be changed later.
2. *Menu → Compute → Instances → Create instance*
   - **Image:** Ubuntu 24.04
   - **Shape:** *VM.Standard.A1.Flex* (Ampere, 1–2 OCPU) if it's available, otherwise *VM.Standard.E2.1.Micro*
     (always available; the script adds swap so it can build).
   - **SSH keys:** "Generate a key pair for me" and download it (you won't need it, but keep it).
   - **Show advanced options → Management → Paste cloud-init script:** paste the whole of
     [`deploy/cloud-init.sh`](deploy/cloud-init.sh), then edit its top four lines: your admin password, and the
     GitHub token if the repo is private.
   - *Create*, and note the **Public IP address** shown on the instance page.
3. Open the web ports: on the instance page click the **subnet** → *Security Lists* → *Default Security List* →
   *Add Ingress Rules*: Source CIDR `0.0.0.0/0`, IP protocol TCP, Destination port range `80,443` → *Add*.

The server now installs itself (about 10–15 minutes).

#### 3. Point the domain at it
Wherever **suhmantics.com**'s DNS is managed (your registrar's website, or Cloudflare), add a record:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `rishikesh` | *the server's public IP* |

On Cloudflare, set it to **DNS only** (grey cloud). Within a few minutes **https://rishikesh.suhmantics.com**
loads, with HTTPS set up automatically.

#### 4. Set it up from your phone
1. Open **/admin** and sign in with the password from the script.
2. **Settings tab → Photos:** upload your own photos — the home banner (the Ganga at Laxman Jhula or Tapovan,
   landscape) and the Ganga Aarti card. Until then a plain placeholder shows in their place. These photos are the
   first thing people see, so make them good ones.
3. **Settings tab:** your name and WhatsApp number (shown to organisers), and later your Claude, Resend, UPI or
   Razorpay keys. Everything here takes effect immediately.
4. **Seed the board before you share the link.** Admin → **To do** shows the *starter flyers* (the real
   flyers photographed in October 2026, already straightened and typed up) — tap **Publish all**. Ones that
   have already happened are skipped. Then walk Tapovan, and for each flyer on a cafe wall:
   **Post a flyer** → photo → **✂️ Straighten & crop** → check details → **Publish free**. Twenty or thirty
   flyers make it feel alive.
5. **Venues & pins tab:** fix any pin that's off (the starter venues have *approximate* pins; until a pin
   is fixed, Directions searches Google Maps by the venue's name). Tapashala's flyer has a QR code with its
   exact Google Maps location — open it from the Tapashala flyer page.
6. Print **/poster** for cafe and hostel noticeboards — the QR code brings travellers in.
7. Offer organisers their first month free; then ₹50 cash.



From a terminal, any Ubuntu server works (Hetzner, DigitalOcean, a ₹500/month VPS):

```bash
git clone https://github.com/suhmantics-droid/rishikesh.git && cd rishikesh
bash deploy/setup.sh      # installs Docker, asks for an admin password, builds and starts
```
`bash deploy/update.sh` pulls and rebuilds by hand; `bash deploy/backup.sh` takes a backup now.
</details>

---

## Running it day to day

| You want to… | Do this |
| --- | --- |
| Post a flyer someone WhatsApped you | Sign in → **Post a flyer** → upload → check → **Cash received (₹50) — publish now** |
| Post a whole wall of flyers from a walk | **Admin → 📸 Add photos** → pick them all → later, **Check & post** each one from *Photos to post* |
| Fix a venue's map pin | In Google Maps tap the place → **Share → Copy link** → **Admin → Venues & pins** → paste → **Use** → **Save** |
| Post today's flyers to Instagram / WhatsApp status | **Admin → Post today's story → Today** (or Tomorrow / Weekend) and pick the app |
| Give a cafe its own poster | **Admin → Venues & pins → 🖨 Print their QR poster** (or /v/&lt;venue&gt;/poster) |
| Post one for free | Same, but **Publish free** |
| Approve an organiser who submitted online and paid you cash | **Admin → To do → ✓ Received — publish** |
| Fix a wrong date/price | Click the listing in **Admin → Listings** → **Edit details** |
| Feature a listing at the top | **Admin → Listings → Feature** |
| Take something down | **Admin → Listings → Hide** (or from a report in **To do**) |
| See what emails went out | **Admin → Email log** |

Organisers get a **private manage link** (by email, and on screen) to edit, see views and renew. If you posted it
for them, open it from Admin → Listings and send them the link.

**Automatic jobs**, every 15 minutes: the morning "what's on today" email from 07:30 IST, a renewal reminder to
organisers 2 days before their listing ends, "starting soon" reminders for flyers people saved to their plan, and
clearing out full-size upload photos after 3 days (they're kept only for straightening). On Vercel they're run by
the GitHub job in `.github/workflows/jobs.yml` (plus Vercel's own daily cron as a backstop); on your own server, by
the app itself. GitHub pauses scheduled jobs in a repository with no commits for 60 days — if the morning emails
stop, re-enable *Scheduled jobs* under the repo's *Actions* tab. **Admin → Send today's digests** runs them by hand.

**Updates:** on Vercel, every push to `main` deploys in a couple of minutes, and a failed build leaves the previous
version running. (Your own server checks GitHub every 15 minutes and rebuilds.) Your data is never touched by
updates.

**Backups:** Admin has CSV downloads of listings, payments and subscribers. On your own server a full backup runs
nightly at 03:15 into `deploy/backups/` (last 14 kept).

---

## Growth tools built in

- **/today** is made for WhatsApp groups: the link preview is a picture of today's list. "Share this list on
  WhatsApp" on the home page uses it automatically when "Today" is selected.
- **Phone notifications** need no account: visitors tap Follow, then "Notify me on this phone". Works on Android
  browsers, and on iPhone once the site is added to the home screen (the site explains how).
- **Stats** (Admin): visitors per day, page views, flyer views and taps — counted without cookies; visitors are
  counted with a daily-rotating anonymous hash. Organisers see their own flyer's numbers on their manage page.
- **Google:** every live flyer carries schema.org Event data, so it can appear in Google's event search.
- **Works on a bad connection:** the site saves the pages and flyers you've looked at. If the signal drops (it
  does, in Tapovan), the last list still opens, with a small "you're offline" note, and taps go through when the
  connection is back.
- **Directories:** /venues and /artists list everyone with a flyer up, each with a one-tap Follow.
- **The flyer map** (/map): every flyer as a small pinned card, spread around its venue so none hide each
  other, with a dotted line back to the exact spot. Tap one for a preview. The same map sits beside the wall
  on the home page.
- **Timetables:** choose *Regular classes* when posting and add each class with its days and times (the
  photo reader fills these in from a schedule grid). They appear as "Daily" / "Mon–Sat" cards on their own
  shelf, as day tabs on the flyer page, and in a folded "drop-in classes" list in the agenda, so tonight's
  concert is never buried under yoga classes. They keep running for as long as the listing is paid for.
- **Story image:** /today/story (and `?when=tomorrow` / `?when=weekend`) is a 1080×1920 picture of the flyers with
  times, venues and the site address. "Share as a story" on /today and in Admin sends it straight to a phone's
  share sheet. One a day on Instagram and in WhatsApp status is the cheapest way to grow.
- **Near me / On now:** "📍 Near me" sorts the wall nearest first and shows walking minutes everywhere; live badges
  show what's on now and what starts within 90 minutes. Both are worked out on the visitor's phone.
- **My plan:** ☆ on any flyer saves it on that phone (no account) and counts as "interested" for the organiser.
  /plan lists saved flyers by day; with notifications on, the phone gets a reminder about an hour before.
- **Venue posters:** /v/&lt;venue&gt;/poster is an A4 "What's on at …" poster whose QR code always shows that venue's
  current flyers — a good thing to hand a cafe owner.
- **Duplicates:** every upload is fingerprinted; the post form and the photo queue warn when a flyer looks like one
  already up, shares its QR code or its name, or repeats another photo from the same batch.
- **QR codes:** nobody can scan a code on their own screen, so codes on uploaded flyers are read and shown
  as buttons (WhatsApp group, booking form, Google Maps pin, website). Payment codes are left out. A map pin
  from a QR code is used for Directions until the venue's own pin is checked.

## Switching things on later

Everything below is set in **/admin → Settings** (no server access needed). A value in the server's `.env`
file overrides the admin page.

### Flyer auto-fill (reads the photo for you)
Add a Claude API key (from <https://console.anthropic.com>). Uploading a flyer then fills in the title, dates
(including "every Saturday"), times, venue, price, artists and contact details for the organiser to check.
It uses Claude Opus 5.5 at low effort with an automatic fallback model; expect roughly ₹1–2 per flyer read.
Results are cached per upload.

### Email alerts
Add a Resend API key from <https://resend.com> (free tier: 3,000 emails/month) and verify **suhmantics.com** in
Resend (it gives you DNS records to add). Until then, emails are only recorded in **Admin → Email log**, not sent.

### Payments
*Payment mode* picks how organisers pay:

| Mode | How it works | Needs |
| --- | --- | --- |
| `cash` *(now)* | Organiser submits; you collect cash and tap **Received** in Admin | nothing |
| `upi` | Organiser scans a QR for your UPI ID and enters the UTR; you approve in Admin. No fees. | UPI ID and payee name |
| `razorpay` | UPI, cards, netbanking; goes live instantly, no manual step. ~2% fee. | Razorpay key ID and secret, plus a webhook to `/api/webhooks/razorpay` (events `payment.captured`, `order.paid`) and its secret |

Price and length are set in the server's `.env`: `LISTING_PRICE_PAISE` (5000 = ₹50) and `LISTING_DAYS` (28).

### Map tiles
The map uses OpenStreetMap tiles, which is fine for a small site. If traffic grows, get a free key from MapTiler or
Stadia Maps and set `NEXT_PUBLIC_MAP_TILES` (rebuild needed). Directions always open in Google Maps.

---

## Local development

```bash
npm install
npm run seed:demo        # optional: 14 sample flyers at fictional venues (marked "Sample")
npm run dev              # http://localhost:3000  — admin password in dev is "admin"
npm test                 # unit + listing-lifecycle tests
```

`npm run seed:demo -- --clear` removes the samples (or use the button in Admin).

## How it's built

- **Next.js 16** (App Router, Cache Components), TypeScript, Tailwind CSS 4
- **SQLite** through `@libsql/client`: hosted by **Turso** when `TURSO_DATABASE_URL` is set, otherwise a file in
  `data/app.db`. Flyers resized to WebP with sharp, stored in **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set,
  otherwise in `data/uploads/` — `src/lib/storage.ts`
- **Leaflet** + OpenStreetMap for the map; QR codes read with `zxing-wasm`; Web Push (`web-push`, VAPID keys generated on first use) for phone notifications
- Share images generated with `next/og`; type set in Fraunces (headings) and Inter
- **Claude** (`@anthropic-ai/sdk`, structured outputs) for reading flyers — `src/lib/extract.ts`
- **Resend** for email — `src/lib/email.ts`
- Payments — `src/lib/payments.ts` (cash / UPI QR / Razorpay)

```
src/app/            pages: / (browse), /map (flyer map), /e/[slug] (event), /v/[slug] (venue) + /poster, /a/[slug] (artist),
                    /today (+ /today/story image), /plan, /venues, /artists, /post, /manage/[token], /alerts, /admin,
                    /about, /poster; api/ routes
src/components/     Browse (filters + views), MapView, FlyerCard, PostFlow, PayWidget, AlertsForm …
src/lib/            db (schema), data (queries), listings (incl. timetables), payments, alerts, extract,
                    qr (QR codes → links), warp (straightening), collage (map layout), starter, uploads (batch
                    queue, duplicates), maplink (Google Maps links → pins), push (incl. plan reminders), storage
                    (disk or Vercel Blob), cron, site
seed/starter/       the starter pack: flyers.json plus the straightened flyer images
deploy/             cloud-init.sh (browser setup), setup.sh, auto-update.sh, backup.sh, update.sh, Caddyfile
tests/              node:test suites (dates, utils, listing lifecycle, filters, payments)
```

Product settings (name, tagline, areas, categories, map centre) are in `src/lib/site.ts`.
