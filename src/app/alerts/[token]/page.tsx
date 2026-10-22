import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertsForm } from "@/components/AlertsForm";
import { getSubscriber } from "@/lib/alerts";
import { listArtists, listVenues } from "@/lib/data";

export const metadata: Metadata = { title: "Your alerts", robots: { index: false } };

export default function ManageAlertsPage({ params, searchParams }: PageProps<"/alerts/[token]">) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-paper-2" />}>
        <Manage params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Manage({ params, searchParams }: Pick<PageProps<"/alerts/[token]">, "params" | "searchParams">) {
  await connection();
  const { token } = await params;
  const sp = await searchParams;
  const sub = getSubscriber(token);
  if (!sub) notFound();
  const showDemo = process.env.NODE_ENV !== "production";
  const [venues, artists] = await Promise.all([listVenues(), listArtists()]);
  return (
    <>
      {sp.confirmed ? (
        <div className="mb-6 rounded-2xl bg-ganga p-5 text-on-ganga">
          <p className="font-display text-2xl font-semibold">Alerts are on ✓</p>
          <p className="text-on-ganga/90">Bookmark this page to change what you follow.</p>
        </div>
      ) : null}
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">Your alerts</h1>
      {!sub.confirmed ? <p className="mb-4 rounded-xl bg-saffron-soft p-3 text-sm text-saffron-ink">Not confirmed yet — tap the link in the email we sent you.</p> : null}
      <AlertsForm
        token={token}
        initial={{ follows: sub.follows, daily: Boolean(sub.daily_digest), email: sub.email }}
        venues={venues.filter((v) => showDemo || !v.is_demo).map((v) => ({ slug: v.slug, name: v.name }))}
        artists={artists.map((a) => ({ slug: a.slug, name: a.name }))}
      />
    </>
  );
}
