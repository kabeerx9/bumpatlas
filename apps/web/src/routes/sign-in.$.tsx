import { SignIn, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

/**
 * Catch-all under /sign-in: Clerk's path-routed <SignIn> drives its multi-step
 * flows (sso-callback, factor-two, …) on sub-paths of its own `path`, so every
 * sub-path must render the same component or OAuth dies on a router 404.
 */
export const Route = createFileRoute("/sign-in/$")({
  component: SignInCatchAllPage,
});

function SignInCatchAllPage() {
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
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
      <div id="clerk-captcha" />
    </div>
  );
}
