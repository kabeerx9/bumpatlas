import { useUser } from "@clerk/react";
import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/page-shell";
import { useMe } from "@/context/me-context";

export const Route = createFileRoute("/_auth/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · BumpAtlas" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useUser();
  const { me, error } = useMe();

  const name =
    user?.fullName ||
    user?.firstName ||
    user?.primaryEmailAddress?.emailAddress ||
    "there";

  return (
    <PageShell className="max-w-3xl">
      <h1 className="font-display text-3xl text-foreground">Welcome, {name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This is your dashboard — your account and settings live here.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Signed-in account</p>
        <p className="mt-1 font-medium text-foreground">{me?.email ?? "Loading…"}</p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>
    </PageShell>
  );
}
