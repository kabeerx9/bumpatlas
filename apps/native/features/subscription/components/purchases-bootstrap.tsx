import { useAuth } from "@clerk/expo";
import { useEffect } from "react";

import { configurePurchases } from "@/lib/purchases/revenuecat";

/** Configures RevenueCat once a signed-in user id is available. */
export function PurchasesBootstrap() {
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    void configurePurchases(userId);
  }, [isSignedIn, userId]);

  return null;
}
