import { useUser } from "@clerk/react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { useMe } from "@/context/me-context";

export const Route = createFileRoute("/_auth/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · BumpAtlas" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useUser();
  const { me, isAdmin, error } = useMe();

  const name =
    user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress || "there";

  return (
    <PageShell className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-foreground">
        Welcome back, {name}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{me?.email ?? "Loading…"}</p>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <div className="card-soft border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Your household</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Households, memories, and children live in the BumpAtlas mobile app. Nothing's set up
            here yet — open the app to create or join your household.
          </p>
          <a
            href="https://bumpatlas.app"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-80"
          >
            Set up in the app
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <div className="card-soft border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Get the app</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The daily journal, challenges, and stage groups all live on your phone.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              App Store
            </span>
            <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              Google Play
            </span>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <Link
          to="/admin"
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent-foreground transition hover:opacity-80"
        >
          Admin dashboard
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}
    </PageShell>
  );
}
