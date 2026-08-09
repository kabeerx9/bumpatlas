import { DefaultGlobalNotFound, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { ApiError, getAdminMetrics, type AdminMetricsResponse } from "@/lib/api";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminPage,
});

/**
 * Founder dashboard, slice 1: totals and active users.
 *
 * Fetched from the component rather than a route loader because the Clerk token
 * getter is installed in an effect (`ClerkAuthSetup`) — a loader on a hard page
 * load races it and would 401. By component mount, the `_auth` layout has
 * confirmed the session, so the token is available.
 */
function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );

  useEffect(() => {
    getAdminMetrics()
      .then((data) => {
        setMetrics(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        // The server 404s for non-admins. Rendering the router's default
        // not-found keeps this surface as invisible client-side as server-side.
        if (err instanceof ApiError && err.status === 404) {
          setStatus("not-found");
        } else {
          setStatus("error");
        }
      });
  }, []);

  if (status === "not-found") {
    return <DefaultGlobalNotFound />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Live totals from the production database.
        </p>
      </div>

      {status === "error" ? (
        <p className="text-destructive text-sm">Failed to load metrics.</p>
      ) : (
        <>
          <section>
            <h2 className="text-muted-foreground text-sm font-medium">Totals</h2>
            <div className="mt-2 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Users" value={metrics?.totals.users} />
              <StatCard label="Families" value={metrics?.totals.families} />
              <StatCard label="Children" value={metrics?.totals.children} />
              <StatCard label="Pregnancies" value={metrics?.totals.pregnancies} />
            </div>
          </section>

          <section>
            <h2 className="text-muted-foreground text-sm font-medium">
              Active users (created something)
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-4">
              <StatCard label="Last 24h" value={metrics?.activeUsers.last1d} />
              <StatCard label="Last 7 days" value={metrics?.activeUsers.last7d} />
              <StatCard label="Last 30 days" value={metrics?.activeUsers.last30d} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}
