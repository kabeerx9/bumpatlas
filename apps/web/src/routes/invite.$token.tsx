import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ApiError, getInvitePreview, type InvitePreview } from "@/lib/api";

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Household invite · BumpAtlas" }] }),
  component: HouseholdInvitePage,
});

function HouseholdInvitePage() {
  const { token } = Route.useParams();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const appHref = useMemo(
    () => `bumpatlas://invite/${encodeURIComponent(token)}`,
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);

    getInvitePreview(token)
      .then((value) => {
        if (!cancelled) setPreview(value);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setPreview(null);
        setError(
          cause instanceof ApiError &&
            (cause.code === "INVITE_EXPIRED" || cause.code === "INVITE_NOT_FOUND")
            ? "This invitation is invalid or has expired. Ask the sender for a new link."
            : "We couldn't check this invitation. Try again from the original link.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="bg-background px-4 py-16 text-foreground sm:px-6">
      <section className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary">
          <Users className="size-6 text-primary" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Household invite
        </p>

        <h1 className="mt-3 font-display text-3xl font-semibold">
          {preview ? `Join ${preview.familyName}` : "Join a BumpAtlas household"}
        </h1>

        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          {loading
            ? "Checking the invitation…"
            : error
              ? error
              : preview
                ? `${preview.inviterDisplayName} invited you as a ${preview.role.toLowerCase()}.`
                : "Open the invitation in BumpAtlas to continue."}
        </p>

        {!loading && !error && preview ? (
          <a
            href={appHref}
            className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Open in BumpAtlas
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        ) : null}

        <div className="mt-8 flex max-w-md items-start gap-3 rounded-xl border border-border bg-card p-4 text-left">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs leading-5 text-muted-foreground">
            The link only previews the household invitation. Signing in, adult confirmation,
            and a valid single-use invite are required before any private memories are available.
          </p>
        </div>
      </section>
    </main>
  );
}
