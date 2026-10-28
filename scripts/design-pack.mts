// Builds the asset half of the Claude Design pack: photos, real flyers, brand tokens, and the site's real
// content as JSON. Run from the repo: npx tsx scripts/design-pack.mts <out dir>
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { AREAS, CATEGORIES, SITE } from "../src/lib/site";
import { VENUE_SEED } from "../src/lib/venue-seed";

const OUT = process.argv[2];
const BASE = "https://rishikesh.suhmantics.com";
const dir = (d: string) => (fs.mkdirSync(path.join(OUT, d), { recursive: true }), path.join(OUT, d));

// 1. Sagar's photos (his picks), 2000 px JPEGs.
const PHOTOS: [string, string][] = [
  ["9746", "banner-ganga-raft-green-hills"],
  ["9771", "white-railed-hill-path"],
  ["9777", "banana-leaves-framing-ridge"],
  ["9787", "dusk-ridges-tree"],
  ["9703", "chai-tent-langurs"],
  ["9763", "blue-sky-green-hills"],
];
for (const [n, name] of PHOTOS) {
  await sharp(`D:/Pictures/Experience Rishikesh/Florida Daytona-${n}.jpg`).rotate().resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(path.join(dir("photos"), `${name}.jpg`));
}

// 2. The real flyers on the site, and the listings' details.
const home = await (await fetch(`${BASE}/?when=all`)).text();
const slugs = [...new Set([...home.matchAll(/href="\/e\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
const listings = [];
for (const slug of slugs) {
  const html = await (await fetch(`${BASE}/e/${slug}`)).text();
  const text = (s: string) => s.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
  const title = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? slug);
  const field = (label: string) => text(html.match(new RegExp(`>${label}<[\\s\\S]{0,200}?<dd[^>]*>([\\s\\S]*?)</dd>`))?.[1] ?? "");
  const flyer = html.match(/\/f\/([a-z0-9]{14})\.webp/)?.[1];
  if (flyer) {
    const img = Buffer.from(await (await fetch(`${BASE}/f/${flyer}.webp`)).arrayBuffer());
    await sharp(img).jpeg({ quality: 85 }).toFile(path.join(dir("flyers"), `${slug}.jpg`));
  }
  listings.push({ title, url: `${BASE}/e/${slug}`, when: field("When"), where: field("Where"), price: field("Price"), flyer: flyer ? `flyers/${slug}.jpg` : null });
}

// 3. Brand: tokens from the stylesheet, the pin mark.
const css = fs.readFileSync("src/app/globals.css", "utf8");
const blocks = [...css.matchAll(/(:root[^{]*\{[\s\S]*?\n\}|@media \(prefers-color-scheme: dark\)\s*\{[\s\S]*?\n\}\n\})/g)].map((m) => m[0]);
fs.writeFileSync(path.join(dir("brand"), "current-tokens.css"), `/* Current colour tokens from the live site (src/app/globals.css). */\n\n${blocks.join("\n\n")}\n`);
fs.copyFileSync("src/app/icon.svg", path.join(dir("brand"), "pin-mark.svg"));

// 4. Content: what the site is made of.
const content = {
  site: { name: SITE.name, place: SITE.place, url: BASE, description: SITE.description },
  categories: CATEGORIES.map((c) => ({ key: c.key, label: c.label, short: c.short, colour: c.color })),
  areas: AREAS.map((a) => a.label),
  places: VENUE_SEED.map((v) => ({
    name: v.name,
    area: AREAS.find((a) => a.key === v.area)?.label,
    kind: v.kind ?? null,
    recommended: Boolean(v.recommended),
    stay: Boolean(v.stay),
    description: v.description,
    google_rating: v.google_rating ?? null,
    google_reviews: v.google_reviews ?? null,
    instagram: v.instagram ? `@${v.instagram}` : null,
  })),
  listings,
};
fs.writeFileSync(path.join(OUT, "content.json"), JSON.stringify(content, null, 2));
console.log(`photos ${PHOTOS.length}, flyers ${listings.filter((l) => l.flyer).length}, listings ${listings.length}, places ${content.places.length}, token blocks ${blocks.length}`);
