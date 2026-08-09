import { env } from "@bumpatlas/env/native";
import { Platform } from "react-native";

import { getEntitlements } from "@/lib/api/billing";

type CustomerInfo = {
  entitlements: { active: Record<string, unknown> };
};

type PurchasesPackage = {
  identifier: string;
  packageType: string;
};

type PurchasesModule = {
  configure: (options: { apiKey: string; appUserID?: string }) => void;
  getOfferings: () => Promise<{ current?: { availablePackages?: PurchasesPackage[] } | null }>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ customerInfo: CustomerInfo }>;
  restorePurchases: () => Promise<CustomerInfo>;
};

let configured = false;
let purchasesModule: PurchasesModule | null | undefined;

const ENTITLEMENT_ID = "premium";

function getPurchases(): PurchasesModule | null {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    // Lazy load — static import crashes Expo Go / binaries without RC native code.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-purchases");
    purchasesModule = (mod?.default ?? mod) as PurchasesModule;
  } catch {
    purchasesModule = null;
  }
  return purchasesModule;
}

export type { PurchasesPackage };

export type PurchaseResult =
  | { status: "success"; isPremium: boolean; customerInfo?: CustomerInfo }
  | { status: "cancelled" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

export async function configurePurchases(appUserId?: string | null): Promise<boolean> {
  const apiKey = env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey || Platform.OS === "web") {
    configured = false;
    return false;
  }

  const Purchases = getPurchases();
  if (!Purchases) {
    configured = false;
    return false;
  }

  try {
    Purchases.configure({
      apiKey,
      appUserID: appUserId ?? undefined,
    });
    configured = true;
    return true;
  } catch {
    configured = false;
    return false;
  }
}

export function isPurchasesConfigured() {
  return configured;
}

export async function getOfferingsPackages(): Promise<PurchasesPackage[]> {
  const Purchases = getPurchases();
  if (!configured || !Purchases) return [];
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!configured || !Purchases) {
    return { status: "unavailable", message: "Purchases are not configured yet." };
  }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return {
      status: "success",
      isPremium: Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]),
      customerInfo,
    };
  } catch (error) {
    const maybe = error as { userCancelled?: boolean; message?: string };
    if (maybe.userCancelled) return { status: "cancelled" };
    return { status: "error", message: maybe.message ?? "Purchase failed" };
  }
}

export async function restorePurchases(): Promise<PurchaseResult> {
  const Purchases = getPurchases();
  if (!configured || !Purchases) {
    return {
      status: "unavailable",
      message:
        "RevenueCat is not configured. Set EXPO_PUBLIC_REVENUECAT_API_KEY and rebuild the native app.",
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]);
    try {
      const server = await getEntitlements();
      return { status: "success", isPremium: server.isPremium || isPremium, customerInfo };
    } catch {
      return { status: "success", isPremium, customerInfo };
    }
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Restore failed",
    };
  }
}

/** Preview subscribe used when RC key is absent — still updates local premium preview. */
export async function previewSubscribe(): Promise<PurchaseResult> {
  return { status: "success", isPremium: true };
}
