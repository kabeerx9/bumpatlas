import { SignUp, useAuth } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AuthLoading } from "@/components/auth-loading";
import { clerkAppearance } from "@/lib/clerk-appearance";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Create account · BumpAtlas" }] }),
  component: SignUpPage,
});

function SignUpPage() {
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
    </div>
  );
}
