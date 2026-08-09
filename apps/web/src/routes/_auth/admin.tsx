import { Skeleton } from "@bumpatlas/ui/components/skeleton";
import { DefaultGlobalNotFound, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/page-shell";
import { useMe } from "@/context/me-context";
import {
  ApiError,
  getAdminMetrics,
  type AdminMetricsRange,
  type AdminMetricsResponse,
} from "@/lib/api";

export const Route = createFileRoute("/_auth/admin")({
  head: () => ({ meta: [{ title: "Admin · BumpAtlas" }] }),
  component: AdminPage,
});

const numberFormatter = new Intl.NumberFormat("en-US");
const formatNumber = (value: number | undefined) =>
  value === undefined ? undefined : numberFormatter.format(value);

/**
 * Founder dashboard, slice 2: signup/engagement timeseries, invites, and the
 * 30d/90d range toggle on top of slice 1's totals and active users.
 *
 * Fetched from the component rather than a route loader because the Clerk token
 * getter is installed in an effect (`ClerkAuthSetup`) — a loader on a hard page
 * load races it and would 401. By component mount, the `_auth` layout has
 * confirmed the session, so the token is available.
 *
 * Authorization has two layers: `useMe().isAdmin` (from `/api/me`) renders an
 * immediate not-found for a non-admin without ever calling the metrics
 * endpoint, and the metrics fetch itself still falls back to the same
 * not-found on a 404 — the server's `requireAdmin` cloak is the real
 * boundary and does not trust the client's `isAdmin` flag.
 */
function AdminPage() {
  const { isReady: isMeReady, isAdmin } = useMe();
  const [range, setRange] = useState<AdminMetricsRange>("30d");
  const [metrics, setMetrics] = useState<AdminMetricsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!isMeReady || !isAdmin) {
      return;
    }

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
  }, [range, isMeReady, isAdmin]);

  if (isMeReady && !isAdmin) {
    return <DefaultGlobalNotFound />;
  }

  if (status === "not-found") {
    return <DefaultGlobalNotFound />;
  }

  const isLoading = !isMeReady || status === "loading";
  const isAllZero =
    status === "ready" &&
    metrics !== null &&
    metrics.totals.users === 0 &&
    metrics.totals.families === 0 &&
    metrics.totals.children === 0 &&
    metrics.totals.pregnancies === 0;

  return (
    <PageShell className="max-w-5xl">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl text-foreground">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live totals from the production database.
          </p>
        </div>
        <RangeToggle value={range} onChange={setRange} disabled={isLoading} />
      </div>

      {status === "error" ? (
        <p className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load metrics. Try refreshing.
        </p>
      ) : isAllZero ? (
        <EmptyState />
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          <section>
            <SectionLabel>Totals</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Users" value={formatNumber(metrics?.totals.users)} loading={isLoading} />
              <StatCard
                label="Families"
                value={formatNumber(metrics?.totals.families)}
                loading={isLoading}
              />
              <StatCard
                label="Children"
                value={formatNumber(metrics?.totals.children)}
                loading={isLoading}
              />
              <StatCard
                label="Pregnancies"
                value={formatNumber(metrics?.totals.pregnancies)}
                loading={isLoading}
              />
            </div>
          </section>

          <section>
            <SectionLabel>Active users (created something)</SectionLabel>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <StatCard
                label="Last 24h"
                value={formatNumber(metrics?.activeUsers.last1d)}
                loading={isLoading}
              />
              <StatCard
                label="Last 7 days"
                value={formatNumber(metrics?.activeUsers.last7d)}
                loading={isLoading}
              />
              <StatCard
                label="Last 30 days"
                value={formatNumber(metrics?.activeUsers.last30d)}
                loading={isLoading}
              />
            </div>
          </section>

          <section>
            <SectionLabel>Invites</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <StatCard label="Sent" value={formatNumber(metrics?.invites.sent)} loading={isLoading} />
              <StatCard
                label="Redeemed"
                value={formatNumber(metrics?.invites.redeemed)}
                loading={isLoading}
              />
            </div>
          </section>

          <section>
            <SectionLabel>Signups per day</SectionLabel>
            <div className="mt-3 rounded-2xl border border-border bg-card p-5">
              <BarChart
                data={metrics?.signupsByDay}
                series={[{ key: "count", label: "Signups" }]}
                loading={isLoading}
              />
            </div>
          </section>

          <section>
            <SectionLabel>Engagement per day</SectionLabel>
            <div className="mt-3 rounded-2xl border border-border bg-card p-5">
              <BarChart
                data={metrics?.engagementByDay}
                series={[
                  { key: "memories", label: "Memories" },
                  { key: "challengeCompletions", label: "Challenge completions" },
                ]}
                loading={isLoading}
              />
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </h2>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">Nothing here yet</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        No accounts, families, or activity have landed in this range. Numbers will show up here
        as soon as the first household signs up.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-14 rounded-md" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value ?? "—"}</p>
      )}
    </div>
  );
}

function RangeToggle({
  value,
  onChange,
  disabled,
}: {
  value: AdminMetricsRange;
  onChange: (range: AdminMetricsRange) => void;
  disabled: boolean;
}) {
  const options: { value: AdminMetricsRange; label: string }[] = [
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
  ];

  return (
    <div
      role="tablist"
      aria-label="Metrics range"
      className="inline-flex gap-0.5 rounded-full border border-border bg-muted p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SERIES_COLORS = ["bg-primary", "bg-accent-foreground/60"];

const dateTickFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDateTick(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return dateTickFormatter.format(parsed);
}

/**
 * Minimal stacked-bar timeseries, no dependency beyond Tailwind utility
 * classes — the spec rules out a charting library. Bars scale to the max
 * total across the whole series so 30d and 90d ranges both stay legible.
 *
 * Only three date ticks render (first / midpoint / last) regardless of range
 * length — at 90 daily bars, one label per bar would overlap into an
 * unreadable smear, so the axis trades density for legibility.
 */
function BarChart<T extends { date: string }>({
  data,
  series,
  loading,
}: {
  data: T[] | undefined;
  series: { key: keyof T; label: string }[];
  loading: boolean;
}) {
  if (loading || !data) {
    return <Skeleton className="h-32 w-full rounded-lg" />;
  }

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }

  const totals = data.map((day) =>
    series.reduce((sum, s) => sum + Number(day[s.key] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  const midIndex = Math.floor((data.length - 1) / 2);

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
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{formatDateTick(data[0]!.date)}</span>
        {data.length > 2 ? <span>{formatDateTick(data[midIndex]!.date)}</span> : null}
        <span>{formatDateTick(data[data.length - 1]!.date)}</span>
      </div>
      {series.length > 1 ? (
        <div className="mt-3 flex gap-4">
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
