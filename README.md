# Pinned · Rishikesh

**Every flyer in Tapovan, on one map.** A website where organisers pin their event flyers (₹50 for 4 weeks), and
travellers filter what's on by date, vibe, price and area, see it on a map, and get alerts for the musicians,
cafes and kinds of events they love.

Built for **rishikesh.suhmantics.com**.

| For visitors | For organisers | For you (admin) |
| --- | --- | --- |
| Flyer wall, day-by-day agenda and map | Snap a flyer → details are read from the photo (optional AI) | Post flyers yourself and record cash in one tap |
| Filter: today / tomorrow / weekend / date, category, area, price, time of day | ₹50 = 4 weeks; recurring events show on every date | Approve organiser submissions once they've paid |
| Follow artists, venues, vibes → email alerts | Private link to edit, see views, renew | Fix map pins, feature/hide listings, handle reports |
| Share a flyer or the whole day's list to WhatsApp; add to calendar; directions | Followers get emailed when the flyer goes live | Revenue, views and subscriber counts |

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
2. **Settings tab:** your name and WhatsApp number (shown to organisers), and later your Claude, Resend, UPI or
   Razorpay keys. Everything here takes effect immediately.
3. **Seed the board before you share the link.** Walk Tapovan, and for each flyer on a cafe wall:
   **Post a flyer** → photo → check details → **Publish free**. Twenty or thirty flyers make it feel alive.
4. **Venues & pins tab:** fix any pin that's off (the 12 starter venues have *approximate* pins).
5. Print **/poster** for cafe and hostel noticeboards — the QR code brings travellers in.
6. Offer organisers their first month free; then ₹50 cash.

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
- **Leaflet** + OpenStreetMap for the map
- **Claude** (`@anthropic-ai/sdk`, structured outputs) for reading flyers — `src/lib/extract.ts`
- **Resend** for email — `src/lib/email.ts`
- Payments — `src/lib/payments.ts` (cash / UPI QR / Razorpay)

```
src/app/            pages: / (browse), /e/[slug] (event), /v/[slug] (venue), /a/[slug] (artist),
                    /post, /manage/[token], /alerts, /admin, /about, /poster; api/ routes
src/components/     Browse (filters + views), MapView, FlyerCard, PostFlow, PayWidget, AlertsForm …
src/lib/            db (schema), data (queries), listings, payments, alerts, extract, cron, site (config)
deploy/             cloud-init.sh (browser setup), setup.sh, auto-update.sh, backup.sh, update.sh, Caddyfile
tests/              node:test suites (dates, utils, listing lifecycle, filters, payments)
```

Product settings (name, tagline, areas, categories, map centre) are in `src/lib/site.ts`.
