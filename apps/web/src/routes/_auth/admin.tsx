import { Skeleton } from "@bumpatlas/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { NotFound } from "@/components/not-found";
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

const rangeDays: Record<AdminMetricsRange, number> = { "30d": 30, "90d": 90 };

const dateRangeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "Jan 1 – Jan 30, 2026" style line under the "Reports" heading. */
function formatHumanDateRange(range: AdminMetricsRange): string {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - (rangeDays[range] - 1));

  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = sameYear
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(start)
    : dateRangeFormatter.format(start);

  return `${startLabel} – ${dateRangeFormatter.format(end)}`;
}

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
        // The server 404s for non-admins. Rendering the same not-found as
        // any other bad URL keeps this surface as invisible client-side as
        // server-side.
        if (err instanceof ApiError && err.status === 404) {
          setStatus("not-found");
        } else {
          setStatus("error");
        }
      });
  }, [range, isMeReady, isAdmin]);

  if (isMeReady && !isAdmin) {
    return <NotFound />;
  }

  if (status === "not-found") {
    return <NotFound />;
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
    <div className="admin-theme">
      <PageShell className="max-w-5xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-3xl font-semibold text-[var(--admin-ink)]">
              Reports
            </h1>
            <p className="mt-1 text-sm text-[var(--admin-secondary)]">
              {formatHumanDateRange(range)}
            </p>
          </div>
          <RangeToggle value={range} onChange={setRange} disabled={isLoading} />
        </div>

        {status === "error" ? (
          <p className="mt-8 rounded-[10px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load metrics. Try refreshing.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            <section>
              <SectionLabel>Overview</SectionLabel>
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-5">
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
                <ActiveUsersCard
                  last1d={formatNumber(metrics?.activeUsers.last1d)}
                  last7d={formatNumber(metrics?.activeUsers.last7d)}
                  last30d={formatNumber(metrics?.activeUsers.last30d)}
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
              <div className="admin-card mt-3 border border-[var(--admin-border)] bg-card p-5">
                <BarChart
                  data={metrics?.signupsByDay}
                  series={[{ key: "count", label: "Signups" }]}
                  loading={isLoading}
                  isAllZero={isAllZero}
                />
              </div>
            </section>

            <section>
              <SectionLabel>Engagement per day</SectionLabel>
              <div className="admin-card mt-3 border border-[var(--admin-border)] bg-card p-5">
                <BarChart
                  data={metrics?.engagementByDay}
                  series={[
                    { key: "memories", label: "Memories" },
                    { key: "challengeCompletions", label: "Challenge completions" },
                  ]}
                  loading={isLoading}
                  isAllZero={isAllZero}
                />
              </div>
            </section>
          </div>
        )}
      </PageShell>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold tracking-wide text-[var(--admin-muted)] uppercase">
      {children}
    </h2>
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
    <div className="admin-card border border-[var(--admin-border)] bg-card p-[18px]">
      <p className="text-xs font-medium text-[var(--admin-muted)]">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-14 rounded-[6px]" />
      ) : (
        <p className="font-display mt-2 text-[26px] font-semibold text-[var(--admin-ink)] tabular-nums">
          {value ?? "—"}
        </p>
      )}
    </div>
  );
}

/** Active users holds its own 1d/7d/30d triple inside a single stat card. */
function ActiveUsersCard({
  last1d,
  last7d,
  last30d,
  loading,
}: {
  last1d: string | undefined;
  last7d: string | undefined;
  last30d: string | undefined;
  loading: boolean;
}) {
  return (
    <div className="admin-card col-span-2 border border-[var(--admin-border)] bg-card p-4 md:col-span-1">
      <p className="text-sm text-[var(--admin-secondary)]">Active users</p>
      <div className="mt-2 flex items-end gap-4">
        {[
          { label: "1d", value: last1d },
          { label: "7d", value: last7d },
          { label: "30d", value: last30d },
        ].map((item) => (
          <div key={item.label}>
            {loading ? (
              <Skeleton className="h-6 w-8 rounded-[6px]" />
            ) : (
              <p className="text-lg font-semibold text-[var(--admin-ink)] tabular-nums">
                {item.value ?? "—"}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">{item.label}</p>
          </div>
        ))}
      </div>
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
      className="inline-flex rounded-[8px] border border-[var(--admin-border)] bg-[var(--admin-segmented-bg)] p-[3px]"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-[6px] px-4 py-[7px] text-[13px] transition-colors disabled:opacity-60 ${
            value === option.value
              ? "bg-[var(--admin-primary)] font-semibold text-white"
              : "font-medium text-[var(--admin-secondary)] hover:text-[var(--admin-ink)]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

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
 * First series renders navy (--admin-primary), second (engagement's
 * "challenge completions") renders the cooler --admin-series-2 tint.
 *
 * Only three date ticks render (first / midpoint / last) regardless of range
 * length — at 90 daily bars, one label per bar would overlap into an
 * unreadable smear, so the axis trades density for legibility.
 */
function BarChart<T extends { date: string }>({
  data,
  series,
  loading,
  isAllZero,
}: {
  data: T[] | undefined;
  series: { key: keyof T; label: string }[];
  loading: boolean;
  isAllZero: boolean;
}) {
  if (loading || !data) {
    return <Skeleton className="h-[120px] w-full rounded-[8px]" />;
  }

  if (isAllZero || data.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-center text-sm text-[var(--admin-muted)]">
        No activity yet — numbers appear as families join
      </div>
    );
  }

  const totals = data.map((day) =>
    series.reduce((sum, s) => sum + Number(day[s.key] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  const midIndex = Math.floor((data.length - 1) / 2);
  const barColors = ["var(--admin-primary)", "var(--admin-series-2)"];

  return (
    <div>
      {series.length > 1 ? (
        <div className="mb-3 flex justify-end gap-4">
          {series.map((s, index) => (
            <div key={String(s.key)} className="flex items-center gap-1.5 text-xs">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ backgroundColor: barColors[index % barColors.length] }}
              />
              <span className="text-[var(--admin-secondary)]">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex h-[120px] items-end gap-[4px]">
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
                  className="w-full first:rounded-t-[2px]"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: value > 0 ? "2px" : 0,
                    backgroundColor: barColors[seriesIndex % barColors.length],
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-[var(--admin-muted)]">
        <span>{formatDateTick(data[0]!.date)}</span>
        {data.length > 2 ? <span>{formatDateTick(data[midIndex]!.date)}</span> : null}
        <span>{formatDateTick(data[data.length - 1]!.date)}</span>
      </div>
    </div>
  );
}
