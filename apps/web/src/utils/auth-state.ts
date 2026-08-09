/**
 * Mirrors Clerk's `isLoaded`/`isSignedIn` outside React, the same trick
 * `clerk-auth.ts` uses for the token getter.
 *
 * Why this exists: `_auth`'s `beforeLoad` needs to know whether the visitor
 * is signed in *before* it decides to redirect, but Clerk only knows that
 * asynchronously — `useAuth()` reports `isLoaded: false` on first paint and
 * flips to `true` once the SDK has read the session. A `beforeLoad` that
 * reads `isLoaded`/`isSignedIn` off a plain module-level snapshot would race
 * that first flip on a hard page load (e.g. a bookmarked /dashboard URL) and
 * bounce a signed-in user to /sign-in. `waitForAuthState` instead resolves a
 * promise once loaded, so `beforeLoad` blocks the transition — no route
 * renders, so there is no flash of protected content — until Clerk has
 * actually answered.
 */

export type AuthState = { isSignedIn: boolean };

let current: AuthState | null = null;
let resolveLoaded: ((state: AuthState) => void) | null = null;

const loadedPromise = new Promise<AuthState>((resolve) => {
  resolveLoaded = resolve;
});

/** Called from an effect once per `isLoaded`/`isSignedIn` change. */
export function setAuthState(isLoaded: boolean, isSignedIn: boolean): void {
  if (!isLoaded) {
    return;
  }

  current = { isSignedIn };
  resolveLoaded?.(current);
  resolveLoaded = null;
}

/**
 * Resolves with the current auth snapshot. If Clerk has already reported
 * loaded, resolves synchronously (well — on the next microtask); otherwise
 * waits for the first `setAuthState(true, ...)` call.
 */
export function waitForAuthState(): Promise<AuthState> {
  return current ? Promise.resolve(current) : loadedPromise;
}
