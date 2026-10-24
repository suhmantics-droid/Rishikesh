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
| QR codes on flyers become tappable buttons (WhatsApp group, booking form, map pin) | QR codes are read automatically | |

---

## Going live on rishikesh.suhmantics.com (trial run) — all from a browser

The site runs on one small server: the app plus [Caddy](https://caddyserver.com) for automatic HTTPS. The
database (SQLite) and flyer photos live on that server. You never need a terminal: the server installs itself
from a script you paste into a web form, and it pulls new code from GitHub every 15 minutes.

### 1. Code on GitHub
The code lives at `github.com/suhmantics-droid/rishikesh`. If the repo is **private**, create a read-only token
for the server: GitHub → Settings → Developer settings → *Fine-grained tokens* → *Generate* → Repository access:
only `rishikesh` → Permissions: *Contents: Read-only*. Copy the token. (A **public** repo needs no token — the
code contains no passwords or keys.)

### 2. A free server (Oracle Cloud "Always Free")
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

### 3. Point the domain at it
Wherever **suhmantics.com**'s DNS is managed (your registrar's website, or Cloudflare), add a record:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `rishikesh` | *the server's public IP* |

On Cloudflare, set it to **DNS only** (grey cloud). Within a few minutes **https://rishikesh.suhmantics.com**
loads, with HTTPS set up automatically.

### 4. Set it up from your phone
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

<details>
<summary>Prefer a terminal, or a different server?</summary>

Any Ubuntu server works (Hetzner, DigitalOcean, a ₹500/month VPS):

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
| Post one for free | Same, but **Publish free** |
| Approve an organiser who submitted online and paid you cash | **Admin → To do → ✓ Received — publish** |
| Fix a wrong date/price | Click the listing in **Admin → Listings** → **Edit details** |
| Feature a listing at the top | **Admin → Listings → Feature** |
| Take something down | **Admin → Listings → Hide** (or from a report in **To do**) |
| See what emails went out | **Admin → Email log** |

Organisers get a **private manage link** (by email, and on screen) to edit, see views and renew. If you posted it
for them, open it from Admin → Listings and send them the link.

**Automatic jobs** (run inside the app every 15 min): the morning "what's on today" email from 07:30 IST, and a
renewal reminder to organisers 2 days before their listing ends.

**Backups** run nightly at 03:15 into `deploy/backups/` on the server (last 14 kept).

**Updates:** the server checks GitHub every 15 minutes and rebuilds when there's new code on `main`; the
version is shown at the top of the admin page. If a build ever fails, the previous version keeps running.
Your data is never touched by updates.

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
- **SQLite** via better-sqlite3 (`data/app.db`); flyers resized to WebP with sharp (`data/uploads/`)
- **Leaflet** + OpenStreetMap for the map; QR codes read with `zxing-wasm`; Web Push (`web-push`, VAPID keys generated on first use) for phone notifications
- Share images generated with `next/og`; type set in Fraunces (headings) and Inter
- **Claude** (`@anthropic-ai/sdk`, structured outputs) for reading flyers — `src/lib/extract.ts`
- **Resend** for email — `src/lib/email.ts`
- Payments — `src/lib/payments.ts` (cash / UPI QR / Razorpay)

```
src/app/            pages: / (browse), /map (flyer map), /e/[slug] (event), /v/[slug] (venue), /a/[slug] (artist),
                    /today, /venues, /artists, /post, /manage/[token], /alerts, /admin, /about, /poster; api/ routes
src/components/     Browse (filters + views), MapView, FlyerCard, PostFlow, PayWidget, AlertsForm …
src/lib/            db (schema), data (queries), listings (incl. timetables), payments, alerts, extract,
                    qr (QR codes → links), warp (straightening), collage (map layout), starter, cron, site
seed/starter/       the starter pack: flyers.json plus the straightened flyer images
deploy/             cloud-init.sh (browser setup), setup.sh, auto-update.sh, backup.sh, update.sh, Caddyfile
tests/              node:test suites (dates, utils, listing lifecycle, filters, payments)
```

Product settings (name, tagline, areas, categories, map centre) are in `src/lib/site.ts`.
