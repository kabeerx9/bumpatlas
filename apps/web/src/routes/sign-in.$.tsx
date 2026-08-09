import { SignIn, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

import { AuthLoading } from "@/components/auth-loading";

const signInSearchSchema = z.object({
  redirect: z.string().optional(),
});

/**
 * Catch-all under /sign-in: Clerk's path-routed <SignIn> drives its multi-step
 * flows (sso-callback, factor-two, …) on sub-paths of its own `path`, so every
 * sub-path must render the same component or OAuth dies on a router 404.
 */
export const Route = createFileRoute("/sign-in/$")({
  validateSearch: signInSearchSchema,
  component: SignInCatchAllPage,
});

function SignInCatchAllPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirect } = Route.useSearch();

  if (!isLoaded) {
    return <AuthLoading />;
  }

  if (isSignedIn) {
    return <Navigate to={redirect ?? "/dashboard"} />;
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background px-4 py-16">
      <h1 className="font-display text-3xl text-foreground">BumpAtlas</h1>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={redirect ?? "/dashboard"}
      />
      <div id="clerk-captcha" />
    </div>
  );
}
