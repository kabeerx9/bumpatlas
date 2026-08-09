import { useAuth } from "@clerk/react";
import { createContext, use, useEffect, useState } from "react";

import { ApiError, getMe, type MeResponse } from "@/lib/api";

type MeState = {
  /** `undefined` while the first fetch is in flight (or before sign-in). */
  me: MeResponse | undefined;
  /** True once /api/me has answered — lets consumers avoid a stale default. */
  isReady: boolean;
  isAdmin: boolean;
  error: string | null;
};

const MeContext = createContext<MeState>({
  me: undefined,
  isReady: false,
  isAdmin: false,
  error: null,
});

/**
 * Fetches `/api/me` once per sign-in and shares it — the Admin nav link and
 * the `/admin` route guard both need `isAdmin`, and fetching it twice would
 * mean two round trips racing on every navigation to /admin.
 *
 * Deliberately does not gate rendering: children render immediately with
 * `isAdmin: false` until the fetch resolves. The `_auth` layout's
 * `beforeLoad` already guarantees the visitor is signed in before this ever
 * mounts, so the only thing this adds is *authorization*, which is safe to
 * arrive a beat later — the server still enforces the real boundary.
 */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [state, setState] = useState<MeState>({
    me: undefined,
    isReady: false,
    isAdmin: false,
    error: null,
  });

  useEffect(() => {
    if (!isSignedIn) {
      setState({ me: undefined, isReady: false, isAdmin: false, error: null });
      return;
    }

    let cancelled = false;

    getMe()
      .then((me) => {
        if (cancelled) return;
        setState({ me, isReady: true, isAdmin: me.isAdmin, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          me: undefined,
          isReady: true,
          isAdmin: false,
          error: err instanceof ApiError ? err.message : "Failed to load account",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  return <MeContext value={state}>{children}</MeContext>;
}

export function useMe(): MeState {
  return use(MeContext);
}
