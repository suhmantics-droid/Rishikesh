import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertsForm } from "@/components/AlertsForm";
import { MineHeader } from "@/components/MineTabs";
import { config } from "@/lib/config";
import { listArtists, listVenues } from "@/lib/data";

export const metadata: Metadata = {
  title: "Following",
  description: "Hear the moment your favourite musician, cafe or kind of event in Tapovan puts up a new flyer.",
};

export default function AlertsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-5 pb-8 lg:pt-8">
      <MineHeader active="following">Choose what you&apos;d like to hear about. When a new flyer goes up for any of them, you&apos;ll know.</MineHeader>
      <Suspense fallback={<div className="h-96 animate-pulse bg-wall-2" />}>
        <Picker />
      </Suspense>
    </div>
  );
}

async function Picker() {
  const showDemo = process.env.NODE_ENV !== "production";
  const [venues, artists, emailKey] = await Promise.all([listVenues(), listArtists(), config("RESEND_API_KEY")]);
  return (
    <AlertsForm
      venues={venues.filter((v) => showDemo || !v.is_demo).map((v) => ({ slug: v.slug, name: v.name }))}
      artists={artists.map((a) => ({ slug: a.slug, name: a.name }))}
      emailOn={Boolean(emailKey)}
    />
  );
}
