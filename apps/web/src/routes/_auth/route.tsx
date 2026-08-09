import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { waitForAuthState } from "@/utils/auth-state";

/**
 * Guards every `/_auth/*` route (dashboard, account, admin) in one place.
 *
 * `beforeLoad` runs before the route's component renders, so a redirect
 * thrown here never lets protected content flash on screen. It awaits
 * `waitForAuthState()` rather than reading Clerk's hook state directly: on a
 * hard page load (e.g. a bookmarked /dashboard URL) this route can match
 * before `ClerkAuthSetup`'s effect has reported Clerk as loaded, and reading
 * a not-yet-loaded snapshot would incorrectly bounce a signed-in user to
 * /sign-in.
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ location }) => {
    const { isSignedIn } = await waitForAuthState();

    if (!isSignedIn) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
