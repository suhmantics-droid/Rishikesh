import type { Metadata } from "next";
import { MineHeader } from "@/components/MineTabs";
import { MyFlyers } from "@/components/MyFlyers";

export const metadata: Metadata = { title: "My flyers", robots: { index: false } };

export default function MyFlyersPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 pt-5 pb-8 lg:pt-8">
      <MineHeader active="flyers">Flyers you&apos;ve posted from this phone. Each one also has its own private link for edits and renewal.</MineHeader>
      <MyFlyers />
    </div>
  );
}
