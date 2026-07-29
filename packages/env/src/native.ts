import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    /** When true (default), product hooks use in-app mock adapters until the API is live. */
    EXPO_PUBLIC_USE_MOCK_DATA: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    /** RevenueCat public SDK key. Empty = purchases stay in preview/no-op mode. */
    EXPO_PUBLIC_REVENUECAT_API_KEY: z.string().optional(),
  },
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
    EXPO_PUBLIC_USE_MOCK_DATA: process.env.EXPO_PUBLIC_USE_MOCK_DATA,
    EXPO_PUBLIC_REVENUECAT_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
  },
  emptyStringAsUndefined: true,
});
