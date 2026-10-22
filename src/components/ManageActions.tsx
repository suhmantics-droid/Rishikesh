"use client";

import { useRouter } from "next/navigation";
import { PayWidget } from "./PayWidget";

export function ManageActions({
  token,
  purpose,
  priceLabel,
  isAdmin,
  mode,
}: {
  token: string;
  purpose: "new" | "renew";
  priceLabel: string;
  isAdmin: boolean;
  mode: "cash" | "upi" | "razorpay";
}) {
  const router = useRouter();
  return (
    <PayWidget
      token={token}
      purpose={purpose}
      priceLabel={priceLabel}
      isAdmin={isAdmin}
      mode={mode}
      onDone={(r) => {
        router.replace(`/manage/${token}?${r === "paid" ? "paid" : "pending"}=1`);
        router.refresh();
      }}
    />
  );
}
