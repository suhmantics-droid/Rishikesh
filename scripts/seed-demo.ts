// Fills the board with SAMPLE flyers at fictional venues so you can see the site working.
// Everything created here is flagged is_demo=1, shows a "Sample" badge, never triggers
// alerts, and can be wiped with:  npm run seed:demo -- --clear
//
//   npm run seed:demo

import sharp from "sharp";
import { db } from "../src/lib/db";
import { addDays, todayIST, weekday } from "../src/lib/dates";
import { saveFlyer } from "../src/lib/images";
import { createListing, ListingInput, publishOrRenew } from "../src/lib/listings";
import type { z } from "zod";

const today = todayIST();
const nextWd = (wd: number) => {
  let d = today;
  while (weekday(d) !== wd) d = addDays(d, 1);
  return d;
};

if (process.argv.includes("--clear")) {
  const d = db();
  d.prepare("DELETE FROM events WHERE is_demo = 1").run();
  d.prepare("DELETE FROM venues WHERE is_demo = 1").run();
  d.prepare("DELETE FROM artists WHERE is_demo = 1 OR id NOT IN (SELECT artist_id FROM event_artists)").run();
  console.log("Demo data removed.");
  process.exit(0);
}

const VENUES = [
  { slug: "demo-moonbeam", name: "Moonbeam Rooftop Cafe", area: "upper-tapovan", lat: 30.1336, lng: 78.3205 },
  { slug: "demo-riverstone", name: "Riverstone Shala", area: "lower-tapovan", lat: 30.1294, lng: 78.3243 },
  { slug: "demo-banyan", name: "Banyan Courtyard", area: "laxman-jhula", lat: 30.1279, lng: 78.3279 },
  { slug: "demo-gangaview", name: "Ganga View Terrace", area: "lower-tapovan", lat: 30.1287, lng: 78.3262 },
  { slug: "demo-lotus", name: "Lotus Hall", area: "upper-tapovan", lat: 30.1347, lng: 78.3178 },
  { slug: "demo-jungle", name: "The Jungle Kitchen", area: "upper-tapovan", lat: 30.1325, lng: 78.3221 },
];

type Demo = {
  title: string;
  sub: string;
  when: string;
  price: string;
  venue: string;
  style: number;
  input: Omit<z.input<typeof ListingInput>, "uploadId" | "venue" | "organiser_email" | "title"> & { title?: string };
  featured?: boolean;
};

const sat = nextWd(6);
const fri = nextWd(5);
const sun = nextWd(0);

const DEMOS: Demo[] = [
  {
    title: "Sunset Jam Session",
    sub: "Bring an instrument · all levels welcome",
    when: "EVERY THU & SUN · 6PM",
    price: "BY DONATION",
    venue: "demo-moonbeam",
    style: 0,
    input: { category: "music", dates: [], sessions: [{ days: [4, 0], start_time: "18:00", end_time: "21:00" }], repeat_until: addDays(today, 27), price_type: "donation", artists: ["The River Drifters"], description: "Open circle jam on the rooftop as the sun drops behind the hills. Guitars, djembes and handpans welcome.", contact_phone: "+91 98765 43210" },
    featured: true,
  },
  {
    title: "Ecstatic Dance & Cacao Journey",
    sub: "DJ Tulsi · Mira Sol",
    when: "SATURDAY · 5:30PM",
    price: "₹600",
    venue: "demo-lotus",
    style: 1,
    input: { category: "dance", dates: [{ date: sat, start_time: "17:30", end_time: "20:30" }], price_type: "paid", price_min: 600, price_note: "incl. ceremonial cacao", artists: ["DJ Tulsi", "Mira Sol"], description: "Opening cacao circle, then a 2-hour journey from slow flow to tribal beats. Substance and alcohol free. Bring water.", contact_instagram: "ecstatic.tapovan" },
    featured: true,
  },
  {
    title: "Full Moon Sound Bath",
    sub: "Anaya Sound Journeys",
    when: `${dayName(addDays(today, 5))} · 7PM`,
    price: "₹500",
    venue: "demo-riverstone",
    style: 2,
    input: { category: "sound", dates: [{ date: addDays(today, 5), start_time: "19:00", end_time: "20:30" }], price_type: "paid", price_min: 500, artists: ["Anaya Sound Journeys"], description: "Crystal bowls, gongs and shruti box under the full moon. Mats provided; bring a shawl." },
  },
  {
    title: "Saturday Kirtan",
    sub: "Mantra Collective",
    when: "EVERY SATURDAY · 7:30PM",
    price: "FREE",
    venue: "demo-banyan",
    style: 3,
    input: { category: "kirtan", dates: [], sessions: [{ days: [6], start_time: "19:30", end_time: "21:30" }], repeat_until: addDays(today, 27), price_type: "free", artists: ["Mantra Collective"], description: "Call-and-response chanting with harmonium and mridangam. Song sheets provided." },
  },
  {
    title: "Open Mic Night",
    sub: "Music · poetry · comedy · 7 min slots",
    when: "FRIDAY · 8PM",
    price: "FREE ENTRY",
    venue: "demo-jungle",
    style: 4,
    input: { category: "comedy", dates: [{ date: fri, start_time: "20:00", end_time: "23:00" }], price_type: "free", artists: [], description: "Sign-up sheet at the bar from 7:30pm. Acoustic set-up and mic provided." },
  },
  {
    title: "Handpan & Flute Evening",
    sub: "Kabir Rao",
    when: `${dayName(addDays(today, 2))} · 7PM`,
    price: "₹300",
    venue: "demo-gangaview",
    style: 2,
    input: { category: "music", dates: [{ date: addDays(today, 2), start_time: "19:00", end_time: "20:30" }], price_type: "paid", price_min: 300, artists: ["Kabir Rao"], description: "Meditative handpan and bansuri overlooking the river." },
  },
  {
    title: "Tapovan Flea Market",
    sub: "Jewellery · art · vintage · food",
    when: "SUNDAY · 11AM–4PM",
    price: "FREE",
    venue: "demo-moonbeam",
    style: 3,
    input: { category: "market", dates: [{ date: sun, start_time: "11:00", end_time: "16:00" }], price_type: "free", artists: [], description: "Local makers and travellers selling handmade things. Want a stall? Message us." },
  },
  {
    title: "Breathwork & Cold Plunge",
    sub: "with Arjun Mehta",
    when: `${dayName(addDays(today, 3))} · 8AM`,
    price: "₹1200",
    venue: "demo-riverstone",
    style: 1,
    input: { category: "yoga", dates: [{ date: addDays(today, 3), start_time: "08:00", end_time: "10:00" }], price_type: "paid", price_min: 1200, artists: ["Arjun Mehta"], description: "Guided breathwork followed by a supervised Ganga-water ice bath. Limited to 15 people." },
  },
  {
    title: "Women's Cacao Circle",
    sub: "Mira Sol",
    when: `${dayName(addDays(today, 4))} · 4PM`,
    price: "₹700",
    venue: "demo-lotus",
    style: 0,
    input: { category: "ceremony", dates: [{ date: addDays(today, 4), start_time: "16:00", end_time: "18:30" }], price_type: "paid", price_min: 700, artists: ["Mira Sol"], description: "Heart-opening cacao, journaling and song. Women only." },
  },
  {
    title: "Morning Satsang by the Ganga",
    sub: "Silent sitting & talk",
    when: "DAILY · 7AM",
    price: "DONATION",
    venue: "demo-banyan",
    style: 4,
    input: { category: "talk", dates: [], sessions: [{ days: [0, 1, 2, 3, 4, 5, 6], start_time: "07:00", end_time: "08:00" }], repeat_until: addDays(today, 10), price_type: "donation", artists: [] },
  },
  {
    title: "Forest Psytrance Gathering",
    sub: "DJ Tulsi · Nomad Beats",
    when: `${dayName(addDays(today, 6))} · 9PM`,
    price: "₹800",
    venue: "demo-jungle",
    style: 1,
    input: { category: "party", dates: [{ date: addDays(today, 6), start_time: "21:00", end_time: "23:59" }], price_type: "paid", price_min: 800, price_max: 1000, price_note: "₹1000 at the door", artists: ["DJ Tulsi", "Nomad Beats"] },
  },
  {
    title: "Rajasthani Folk Night",
    sub: "Thar Folk Collective",
    when: "TONIGHT · 7:30PM",
    price: "₹200",
    venue: "demo-gangaview",
    style: 3,
    input: { category: "music", dates: [{ date: today, start_time: "19:30", end_time: "21:30" }], price_type: "paid", price_min: 200, artists: ["Thar Folk Collective"], description: "Kamaicha, khartal and desert songs from Jaisalmer." },
  },
  {
    title: "Sitar Recital",
    sub: "Ravi Desai · tabla: Sunil K.",
    when: `${dayName(addDays(today, 8))} · 6:30PM`,
    price: "₹400",
    venue: "demo-lotus",
    style: 2,
    input: { category: "music", dates: [{ date: addDays(today, 8), start_time: "18:30", end_time: "20:00" }], price_type: "paid", price_min: 400, artists: ["Ravi Desai"] },
  },
  {
    title: "Film Night: Himalayan Stories",
    sub: "Documentary double bill",
    when: `${dayName(addDays(today, 1))} · 8PM`,
    price: "FREE",
    venue: "demo-moonbeam",
    style: 4,
    input: { category: "film", dates: [{ date: addDays(today, 1), start_time: "20:00", end_time: "22:30" }], price_type: "free", artists: [] },
  },
];

function dayName(date: string) {
  const [, m, d] = date.split("-").map(Number);
  const wd = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][weekday(date)];
  const mon = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][m - 1];
  return `${wd} ${d} ${mon}`;
}

const STYLES = [
  { bg: ["#ff9a3c", "#e8475f"], ink: "#fff8ee", accent: "#2b1840", font: "Inter", w: 1080, h: 1350 },
  { bg: ["#1b0f3b", "#6a1b9a"], ink: "#ffe9ff", accent: "#ffd34e", font: "Inter", w: 1080, h: 1350 },
  { bg: ["#0b3d4a", "#127a7a"], ink: "#eafff9", accent: "#ffcf70", font: "DejaVu Serif", w: 1240, h: 1754 },
  { bg: ["#f7e7c6", "#f2c46f"], ink: "#3a1f05", accent: "#b23a10", font: "DejaVu Serif", w: 1240, h: 1754 },
  { bg: ["#111111", "#2a2a2a"], ink: "#ffffff", accent: "#ff5c39", font: "Inter", w: 1080, h: 1080 },
];

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function wrap(text: string, max: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      lines.push(line.trim());
      line = w;
    } else line += " " + w;
  }
  lines.push(line.trim());
  return lines;
}

function flyerSvg(d: Demo, venueName: string) {
  const s = STYLES[d.style];
  const titleLines = wrap(d.title.toUpperCase(), s.w > 1100 ? 14 : 12);
  const size = s.w > 1100 ? 120 : 104;
  const title = titleLines
    .map((l, i) => `<text x="50%" y="${s.h * 0.3 + i * size * 1.05}" text-anchor="middle" font-size="${size}" font-weight="900">${x(l)}</text>`)
    .join("");
  const after = s.h * 0.3 + titleLines.length * size * 1.05;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.bg[0]}"/><stop offset="1" stop-color="${s.bg[1]}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${s.w * 0.85}" cy="${s.h * 0.12}" r="${s.w * 0.18}" fill="${s.accent}" opacity=".25"/>
  <circle cx="${s.w * 0.1}" cy="${s.h * 0.92}" r="${s.w * 0.25}" fill="${s.accent}" opacity=".18"/>
  <g font-family="${s.font}" fill="${s.ink}">
    <text x="50%" y="${s.h * 0.12}" text-anchor="middle" font-size="40" letter-spacing="10" font-weight="700" fill="${s.accent}">TAPOVAN · RISHIKESH</text>
    ${title}
    <text x="50%" y="${after + 40}" text-anchor="middle" font-size="46" font-style="italic">${x(d.sub)}</text>
    <rect x="${s.w * 0.12}" y="${after + 110}" width="${s.w * 0.76}" height="150" rx="24" fill="${s.accent}"/>
    <text x="50%" y="${after + 205}" text-anchor="middle" font-size="60" font-weight="900" fill="${s.bg[1]}">${x(d.when)}</text>
    <text x="50%" y="${s.h - 210}" text-anchor="middle" font-size="52" font-weight="700">📍 ${x(venueName)}</text>
    <text x="50%" y="${s.h - 120}" text-anchor="middle" font-size="64" font-weight="900" fill="${s.accent}">${x(d.price)}</text>
  </g>
</svg>`;
}

async function main() {
  const d = db();
  const insVenue = d.prepare(
    "INSERT OR IGNORE INTO venues (slug, name, area, lat, lng, coords_verified, is_demo, description) VALUES (@slug, @name, @area, @lat, @lng, 1, 1, 'Fictional venue for sample listings.')",
  );
  for (const v of VENUES) insVenue.run(v);

  for (const demo of DEMOS) {
    const venue = VENUES.find((v) => v.slug === demo.venue)!;
    const png = await sharp(Buffer.from(flyerSvg(demo, venue.name))).png().toBuffer();
    const up = await saveFlyer(png);
    const { id } = createListing(
      ListingInput.parse({
        ...demo.input,
        title: demo.title,
        uploadId: up.id,
        venue: { slug: venue.slug },
        organiser_email: "demo@example.com",
        organiser_name: "Sample organiser",
      }),
    );
    publishOrRenew(id);
    d.prepare("UPDATE events SET is_demo = 1, featured = ?, views = ? WHERE id = ?").run(demo.featured ? 1 : 0, 20 + Math.floor(Math.random() * 300), id);
    d.prepare("UPDATE artists SET is_demo = 1 WHERE id IN (SELECT artist_id FROM event_artists WHERE event_id = ?)").run(id);
    console.log(`  + ${demo.title}`);
  }
  console.log(`Seeded ${DEMOS.length} sample flyers.`);
}

main();
