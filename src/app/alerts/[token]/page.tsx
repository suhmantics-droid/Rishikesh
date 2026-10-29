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
    <div className="mx-auto max-w-3xl px-4 pt-5 pb-8 lg:pt-8">
      <Suspense fallback={<div className="h-96 animate-pulse bg-wall-2" />}>
        <Manage params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Manage({ params, searchParams }: Pick<PageProps<"/alerts/[token]">, "params" | "searchParams">) {
  await connection();
  const { token } = await params;
  const sp = await searchParams;
  const sub = await getSubscriber(token);
  if (!sub) notFound();
  const showDemo = process.env.NODE_ENV !== "production";
  const [venues, artists] = await Promise.all([listVenues(), listArtists()]);
  return (
    <>
      {sp.confirmed ? (
        <div className="mb-6 flex flex-col gap-1 bg-act p-5 text-on-act">
          <p className="text-[21px] font-extrabold">Email alerts are on</p>
          <p className="text-[16px]">Bookmark this page to change what you follow.</p>
        </div>
      ) : null}
      <h1 className="mb-6 text-[30px] leading-tight font-extrabold [font-stretch:88%]">Your email alerts</h1>
      {!sub.confirmed ? <p className="mb-4 bg-now-soft p-3 text-[16px]">Not confirmed yet. Tap the link in the email we sent you.</p> : null}
      <AlertsForm
        token={token}
        initial={{ follows: sub.follows, daily: Boolean(sub.daily_digest), email: sub.email }}
        venues={venues.filter((v) => showDemo || !v.is_demo).map((v) => ({ slug: v.slug, name: v.name }))}
        artists={artists.map((a) => ({ slug: a.slug, name: a.name }))}
      />
    </>
  );
}
