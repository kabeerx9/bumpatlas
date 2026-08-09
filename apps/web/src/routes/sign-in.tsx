import { SignIn, useAuth } from "@clerk/react";
import { Navigate, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { AuthLoading } from "@/components/auth-loading";
import { clerkAppearance } from "@/lib/clerk-appearance";

const signInSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: signInSearchSchema,
  head: () => ({ meta: [{ title: "Sign in · BumpAtlas" }] }),
  component: SignInPage,
});

function SignInPage() {
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
      <h1 className="font-display text-2xl font-semibold text-foreground">BumpAtlas</h1>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={redirect ?? "/dashboard"}
        appearance={clerkAppearance}
      />
    </div>
  );
}
