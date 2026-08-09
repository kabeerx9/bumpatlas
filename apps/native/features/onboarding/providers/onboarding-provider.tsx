import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  getOnboardingComplete,
  setOnboardingComplete,
} from "@/features/onboarding/storage/onboarding-storage";
import * as familiesApi from "@/lib/api/families";
import { queryKeys } from "@/lib/api/hooks";

type OnboardingContextValue = {
  isOnboardingLoading: boolean;
  isOnboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [isLocalFlagLoading, setIsLocalFlagLoading] = useState(false);
  const [localFlagLoaded, setLocalFlagLoaded] = useState(false);
  const [isLocalOnboardingComplete, setIsLocalOnboardingComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOnboarding() {
      if (!isLoaded || !userId) {
        setIsLocalFlagLoading(false);
        setLocalFlagLoaded(false);
        setIsLocalOnboardingComplete(false);
        return;
      }

      setIsLocalFlagLoading(true);

      try {
        const complete = await getOnboardingComplete(userId);
        if (!cancelled) {
          setIsLocalOnboardingComplete(complete);
        }
      } finally {
        if (!cancelled) {
          setIsLocalFlagLoading(false);
          setLocalFlagLoaded(true);
        }
      }
    }

    void loadOnboarding();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId]);

  /**
   * Server-derived fallback for the local flag. `getOnboardingComplete` only
   * knows about onboarding runs that happened on *this* device — a reinstall,
   * or a second device on the same account, has no local flag even though the
   * household already exists server-side. Once the local flag has loaded and
   * says "not complete", ask the server whether the user already has a
   * default family; `GET /families/current` 404s with FAMILY_NOT_FOUND when
   * onboarding genuinely hasn't run yet (a legitimate response, not an error
   * to retry). Skipped entirely once the local flag is already true (fast
   * path — no need to hit the network on every launch).
   */
  const shouldCheckServer = isLoaded && !!userId && localFlagLoaded && !isLocalOnboardingComplete;

  const familyCheckQuery = useQuery({
    // Same key `useFamilyQuery` (lib/api/hooks.ts) uses for `GET
    // /families/current` — sharing the cache entry means the Today screen's
    // family query doesn't re-fetch from cold on first launch after this
    // check already ran.
    queryKey: queryKeys.family,
    queryFn: () => familiesApi.getCurrentFamily(),
    enabled: shouldCheckServer,
    retry: false,
  });

  useEffect(() => {
    if (!shouldCheckServer || !familyCheckQuery.isSuccess || !userId) {
      return;
    }
    // Server confirms a household exists — cache locally so future launches
    // take the fast path without a network round trip.
    setIsLocalOnboardingComplete(true);
    void setOnboardingComplete(userId);
  }, [familyCheckQuery.isSuccess, shouldCheckServer, userId]);

  const isOnboardingComplete = isLocalOnboardingComplete;

  // Still resolving if: the local flag hasn't loaded yet, or the local flag
  // says "not complete" and the server check is in flight. A query error
  // (404 or otherwise) resolves the loading state — an unreachable server
  // falls back to treating the user as not-yet-onboarded rather than hanging
  // on a splash screen forever.
  const isOnboardingLoading =
    isLocalFlagLoading ||
    (shouldCheckServer && familyCheckQuery.isPending);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      isOnboardingLoading,
      isOnboardingComplete,
      completeOnboarding: async () => {
        if (!userId) {
          return;
        }

        await setOnboardingComplete(userId);
        setIsLocalOnboardingComplete(true);
      },
    }),
    [isOnboardingComplete, isOnboardingLoading, userId],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
