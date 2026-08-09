import { DefaultGlobalNotFound, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import {
  ApiError,
  getAdminMetrics,
  type AdminMetricsRange,
  type AdminMetricsResponse,
} from "@/lib/api";

export const Route = createFileRoute("/_auth/admin")({
  component: AdminPage,
});

/**
 * Founder dashboard, slice 2: signup/engagement timeseries, invites, and the
 * 30d/90d range toggle on top of slice 1's totals and active users.
 *
 * Fetched from the component rather than a route loader because the Clerk token
 * getter is installed in an effect (`ClerkAuthSetup`) — a loader on a hard page
 * load races it and would 401. By component mount, the `_auth` layout has
 * confirmed the session, so the token is available.
 */
function AdminPage() {
  const [range, setRange] = useState<AdminMetricsRange>("30d");
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );

  useEffect(() => {
    setStatus((prev) => (prev === "not-found" || prev === "error" ? prev : "loading"));

    getAdminMetrics(range)
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
  }, [range]);

  if (status === "not-found") {
    return <DefaultGlobalNotFound />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live totals from the production database.
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} />
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

          <section>
            <h2 className="text-muted-foreground text-sm font-medium">Invites</h2>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <StatCard label="Sent" value={metrics?.invites.sent} />
              <StatCard label="Redeemed" value={metrics?.invites.redeemed} />
            </div>
          </section>

          <section>
            <h2 className="text-muted-foreground text-sm font-medium">Signups per day</h2>
            <div className="mt-2 rounded-lg border p-4">
              <BarChart
                data={metrics?.signupsByDay}
                series={[{ key: "count", label: "Signups" }]}
              />
            </div>
          </section>

          <section>
            <h2 className="text-muted-foreground text-sm font-medium">Engagement per day</h2>
            <div className="mt-2 rounded-lg border p-4">
              <BarChart
                data={metrics?.engagementByDay}
                series={[
                  { key: "memories", label: "Memories" },
                  { key: "challengeCompletions", label: "Challenge completions" },
                ]}
              />
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

function RangeToggle({
  value,
  onChange,
}: {
  value: AdminMetricsRange;
  onChange: (range: AdminMetricsRange) => void;
}) {
  const options: AdminMetricsRange[] = ["30d", "90d"];

  return (
    <div className="flex gap-1 rounded-lg border p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
            value === option
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

const SERIES_COLORS = ["bg-foreground", "bg-muted-foreground"];

/**
 * Minimal stacked-bar timeseries, no dependency beyond Tailwind utility
 * classes — the spec rules out a charting library. Bars scale to the max
 * total across the whole series so 30d and 90d ranges both stay legible.
 */
function BarChart<T extends { date: string }>({
  data,
  series,
}: {
  data: T[] | undefined;
  series: { key: keyof T; label: string }[];
}) {
  if (!data) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm">No data.</p>;
  }

  const totals = data.map((day) =>
    series.reduce((sum, s) => sum + Number(day[s.key] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);

  return (
    <div>
      <div className="flex h-32 items-end gap-px">
        {data.map((day, index) => (
          <div
            key={day.date}
            className="group relative flex flex-1 flex-col justify-end"
            title={`${day.date}: ${series
              .map((s) => `${s.label} ${String(day[s.key])}`)
              .join(", ")}`}
          >
            {series.map((s, seriesIndex) => {
              const value = Number(day[s.key] ?? 0);
              const heightPct = (value / max) * 100;
              return (
                <div
                  key={String(s.key)}
                  className={`w-full ${SERIES_COLORS[seriesIndex % SERIES_COLORS.length]} opacity-80 first:rounded-t-sm`}
                  style={{ height: `${heightPct}%`, minHeight: value > 0 ? "2px" : 0 }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex justify-between text-xs">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
      {series.length > 1 ? (
        <div className="mt-2 flex gap-4">
          {series.map((s, index) => (
            <div key={String(s.key)} className="flex items-center gap-1.5 text-xs">
              <span
                className={`h-2 w-2 rounded-sm ${SERIES_COLORS[index % SERIES_COLORS.length]}`}
              />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
