/** Placeholder shown while Clerk reports whether the visitor is signed in —
 * shaped like the auth card it's about to be replaced by, so there's no
 * layout jump once <SignIn>/<SignUp> mounts. */
export function AuthLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 bg-background px-4 py-16">
      <h1 className="font-display text-2xl font-semibold text-foreground">BumpAtlas</h1>
      <div className="card-soft flex h-72 w-full max-w-sm items-center justify-center border border-border bg-card">
        <span
          className="size-5 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden="true"
        />
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
