import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { todayIST } from "@/lib/dates";
import { SITE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const today = todayIST();
  const events = (await db()
    .prepare("SELECT slug, updated_at FROM events WHERE status = 'live' AND live_until >= ? AND is_demo = 0")
    .all(today)) as { slug: string; updated_at: string }[];
  const venues = (await db().prepare("SELECT slug FROM venues WHERE is_demo = 0").all()) as { slug: string }[];
  return [
    { url: SITE.url, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly" },
    { url: `${SITE.url}/today`, changeFrequency: "daily" },
    { url: `${SITE.url}/map`, changeFrequency: "daily" },
    { url: `${SITE.url}/venues`, changeFrequency: "daily" },
    { url: `${SITE.url}/artists`, changeFrequency: "daily" },
    ...events.map((e) => ({ url: `${SITE.url}/e/${e.slug}`, lastModified: e.updated_at.replace(" ", "T") + "Z" })),
    ...venues.map((v) => ({ url: `${SITE.url}/v/${v.slug}`, changeFrequency: "daily" as const })),
  ];
}
