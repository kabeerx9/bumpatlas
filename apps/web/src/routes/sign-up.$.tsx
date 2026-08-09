import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

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
    return <div className="flex min-h-[60vh] items-center justify-center">Loading...</div>;
  }

  if (isSignedIn) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">BumpAtlas</h1>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
      <div id="clerk-captcha" />
    </div>
  );
}
