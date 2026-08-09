import { useAuth } from "@clerk/react";
import { useEffect } from "react";

import { setAuthState } from "@/utils/auth-state";
import { setClerkAuthTokenGetter } from "@/utils/clerk-auth";

export function ClerkAuthSetup({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setClerkAuthTokenGetter(() => getToken());
    return () => setClerkAuthTokenGetter(null);
  }, [getToken]);

  useEffect(() => {
    setAuthState(isLoaded, Boolean(isSignedIn));
  }, [isLoaded, isSignedIn]);

  return children;
}
