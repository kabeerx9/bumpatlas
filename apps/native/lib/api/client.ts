import { createApiClient } from "@bumpatlas/contracts";
import { env } from "@bumpatlas/env/native";

import { getClerkAuthToken } from "@/utils/clerk-auth";

export const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_SERVER_URL,
  getToken: getClerkAuthToken,
});

export const useMockData = env.EXPO_PUBLIC_USE_MOCK_DATA;
