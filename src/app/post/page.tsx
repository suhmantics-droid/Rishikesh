import type { Metadata } from "next";
import { Suspense } from "react";
import { PostFlow } from "@/components/PostFlow";
import { isAdmin } from "@/lib/admin";
import { listVenues } from "@/lib/data";
import { todayIST } from "@/lib/dates";
import { config } from "@/lib/config";
import { aiEnabled } from "@/lib/extract";
import { ownerContact, payMode } from "@/lib/payments";
import { LISTING, rupees } from "@/lib/site";

export const metadata: Metadata = {
  title: "Post a flyer",
  description: `Put your event on the Tapovan map for ${rupees(LISTING.pricePaise)}. Snap your flyer, add the details, and it's on the map.`,
};

export default function PostPage({ searchParams }: PageProps<"/post">) {
  return (
    <div className="px-4 py-6 sm:py-10">
      <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-3xl bg-paper-2" />}>
        <Flow searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Flow({ searchParams }: { searchParams: PageProps<"/post">["searchParams"] }) {
  const sp = await searchParams;
  const venues = await listVenues();
  const admin = await isAdmin();
  const showDemo = process.env.NODE_ENV !== "production";
  return (
    <PostFlow
      key={typeof sp.edit === "string" ? sp.edit : typeof sp.upload === "string" ? sp.upload : "new"}
      venues={venues.filter((v) => showDemo || !v.is_demo).map((v) => ({ slug: v.slug, name: v.name, area: v.area, is_demo: v.is_demo }))}
      today={todayIST()}
      priceLabel={rupees(LISTING.pricePaise)}
      listingDays={LISTING.days}
      isAdmin={admin}
      editToken={typeof sp.edit === "string" ? sp.edit : undefined}
      openUpload={admin && typeof sp.upload === "string" ? sp.upload : undefined}
      payMode={await payMode()}
      owner={await ownerContact()}
      autoFill={await aiEnabled()}
      emailOn={Boolean(await config("RESEND_API_KEY"))}
    />
  );
}
