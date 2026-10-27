import type { Metadata } from "next";
import { PlanList } from "@/components/Plan";

export const metadata: Metadata = { title: "My plan", robots: { index: false } };

export default function PlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <h1 className="font-display text-4xl font-semibold tracking-tight">My plan</h1>
      <p className="mt-2 mb-6 text-ink-2">The flyers you&apos;ve saved, day by day. Kept on this phone — no account needed.</p>
      <PlanList />
    </div>
  );
}
