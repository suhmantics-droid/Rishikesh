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

## Going live on rishikesh.suhmantics.com (trial run)

The site is one small server: the app plus [Caddy](https://caddyserver.com) for automatic HTTPS. The
database (SQLite) and flyer photos live in `./data` on that server.

### 1. Get a free server

**Oracle Cloud "Always Free"** gives you a small server at no cost, with a **Mumbai** region close to Rishikesh.

1. Sign up at <https://www.oracle.com/cloud/free/> (needs a card for identity check; Always Free resources aren't
   charged). Pick **India West (Mumbai)** as your home region — it can't be changed later.
2. *Compute → Instances → Create instance*:
   - Image: **Ubuntu 24.04**
   - Shape: **VM.Standard.A1.Flex** (Ampere, 1–2 OCPU, 6–12 GB) if available; otherwise
     **VM.Standard.E2.1.Micro** (always available — the setup script adds swap so it can build).
   - Add your SSH key, create, and note the **public IP address**.
3. *Networking → Virtual cloud network → your subnet → Security list → Add ingress rules*:
   source `0.0.0.0/0`, TCP, destination ports **80** and **443**.

Any Ubuntu server works the same way (Hetzner, DigitalOcean, a ₹500/month VPS) if you'd rather pay for one.

### 2. Point the domain at it

Wherever **suhmantics.com**'s DNS is managed (your registrar, Cloudflare, …) add:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `rishikesh` | *your server's public IP* |

If you use Cloudflare, set the record to **DNS only** (grey cloud) so Caddy can get the certificate.

### 3. Put the code on the server and run setup

```bash
ssh ubuntu@YOUR_SERVER_IP
git clone https://github.com/suhmantics-droid/rishikesh.git   # or upload the folder with scp
cd rishikesh
bash deploy/setup.sh
```

The script installs Docker, opens ports 80/443, asks for an admin password and your WhatsApp number, builds
the app and starts it. Give DNS a few minutes, then open **https://rishikesh.suhmantics.com**. The HTTPS
certificate is issued automatically on the first visit.

### 4. Seed the board before you tell anyone

An empty board is the fastest way to lose a visitor. Before sharing the link:

1. Sign in at **/admin**.
2. Walk Tapovan with your phone. For each flyer on a cafe wall: **Post a flyer** → photo → check details →
   **Publish free (seeding)**. Twenty or thirty flyers make the site feel alive.
3. In **Admin → Venues & pins**, fix any pins that are off (the starter list of 12 Tapovan venues has
   *approximate* pins). Tap the right spot, save.
4. Print the **/poster** page and pin it on cafe and hostel noticeboards — the QR code brings travellers in.
5. Offer organisers their first month free; then it's ₹50 cash.

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

**Backups** run nightly at 03:15 into `deploy/backups/` (last 14 kept). Copy that folder off the server now
and then. Run one any time with `bash deploy/backup.sh`.

**Updates:** `bash deploy/update.sh` pulls the latest code and rebuilds. Your data is untouched.

---

## Switching things on later

All settings live in `.env` on the server. After editing it run `sudo docker compose up -d`.

### Flyer auto-fill (reads the photo for you)
Set `ANTHROPIC_API_KEY` (from <https://console.anthropic.com>). Uploading a flyer then fills in the title, dates
(including "every Saturday"), times, venue, price, artists and contact details for the organiser to check.
It uses Claude Opus 5.5 at low effort with an automatic fallback model; expect roughly ₹1–2 per flyer read.
Results are cached per upload.

### Email alerts
Set `RESEND_API_KEY` from <https://resend.com> (free tier: 3,000 emails/month) and verify **suhmantics.com** in
Resend (it gives you DNS records to add). Until then, emails are only recorded in **Admin → Email log**, not sent.

### Payments
`PAYMENTS_MODE` picks how organisers pay:

| Mode | How it works | Needs |
| --- | --- | --- |
| `cash` *(now)* | Organiser submits; you collect cash and tap **Received** in Admin | nothing |
| `upi` | Organiser scans a QR for your UPI ID and enters the UTR; you approve in Admin. No fees. | `UPI_ID`, `UPI_PAYEE_NAME` |
| `razorpay` | UPI, cards, netbanking; goes live instantly, no manual step. ~2% fee. | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a webhook to `/api/webhooks/razorpay` (events `payment.captured`, `order.paid`) with `RAZORPAY_WEBHOOK_SECRET` |

Price and length: `LISTING_PRICE_PAISE` (5000 = ₹50) and `LISTING_DAYS` (28).

### Map tiles
The map uses OpenStreetMap tiles, which is fine for a small site. If traffic grows, get a free key from MapTiler or
Stadia Maps and set `NEXT_PUBLIC_MAP_TILES` (rebuild needed). Directions always open in Google Maps.

---

## Local development

```bash
npm install
npm run seed:demo        # optional: 14 sample flyers at fictional venues (marked "Sample")
npm run dev              # http://localhost:3000  — admin password in dev is "admin"
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
deploy/             setup.sh, backup.sh, update.sh, Caddyfile
```

Product settings (name, tagline, areas, categories, map centre) are in `src/lib/site.ts`.
