import type { Metadata } from "next";
import { MineHeader } from "@/components/MineTabs";
import { PlanList } from "@/components/Plan";

export const metadata: Metadata = { title: "My plan", robots: { index: false } };

export default function PlanPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-5 pb-8 lg:pt-8">
      <MineHeader active="plan">What you&apos;ve saved, day by day. Kept on this phone, no account needed.</MineHeader>
      <PlanList />
    </div>
  );
}
