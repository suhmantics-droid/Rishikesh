import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsForm } from "@/components/AlertsForm";
import { listArtists, listVenues } from "@/lib/data";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Get an email when your favourite musician, cafe or kind of event in Tapovan puts up a new flyer.",
};

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Never hear about it the day after</h1>
      <p className="mt-2 mb-6 text-ink-2">
        Pick the musicians, cafes and vibes you love. The moment a new flyer for them goes up, we&apos;ll email you.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-2" />}>
        <Picker />
      </Suspense>
    </div>
  );
}

async function Picker() {
  const showDemo = process.env.NODE_ENV !== "production";
  const [venues, artists] = await Promise.all([listVenues(), listArtists()]);
  return (
    <AlertsForm
      venues={venues.filter((v) => showDemo || !v.is_demo).map((v) => ({ slug: v.slug, name: v.name }))}
      artists={artists.map((a) => ({ slug: a.slug, name: a.name }))}
    />
  );
}
