import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AuthLoading } from "@/components/auth-loading";
import { clerkAppearance } from "@/lib/clerk-appearance";

/**
 * Catch-all under /sign-up — same reason as sign-in.$.tsx: Clerk's path-routed
 * component owns its sub-paths (verify-email-address, sso-callback, …).
 */
export const Route = createFileRoute("/sign-up/$")({
  component: SignUpCatchAllPage,
});

function SignUpCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-foreground">BumpAtlas</h1>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
      <div id="clerk-captcha" />
    </div>
  );
}
