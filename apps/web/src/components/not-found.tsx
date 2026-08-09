import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/**
 * Used both as the router's global not-found (__root.tsx) and as the
 * "you're not an admin" fallback on /admin — the two cases should be
 * indistinguishable, so a non-admin poking at /admin sees exactly the same
 * page as a stray URL, not a different "forbidden" surface that would leak
 * whether the route exists.
 */
export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="font-display text-[15px] font-semibold text-muted-foreground">404</p>
      <h1 className="font-display text-[26px] font-semibold text-foreground">
        This page doesn&apos;t exist
      </h1>
      <p className="max-w-sm text-sm text-[#4B4F45]">
        Check the address, or head back to somewhere familiar.
      </p>
      <Link
        to="/dashboard"
        className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-[10px] bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Back to dashboard
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}
