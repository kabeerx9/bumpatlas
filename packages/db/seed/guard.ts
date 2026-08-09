/**
 * Shared safety guard for the demo seeds.
 *
 * Fails closed, and says out loud what it is about to write to.
 *
 * The previous version — duplicated in both seed scripts — checked `NODE_ENV !== "production"`
 * and a `/prod/i` match on the connection string. Both pass trivially against a hosted
 * database: a Supabase project ref is a random slug that will never contain "prod", and
 * NODE_ENV is `development` on every developer machine regardless of which database the URL
 * points at. That is a guard which only catches a database someone already took the trouble
 * to *name* production.
 *
 * So the rule is inverted. Writing demo data anywhere other than a local Postgres now needs an
 * explicit `ALLOW_DEMO_SEED=1`, and the target host is printed either way — the point is that
 * nobody seeds a remote database without having read which one it is.
 */
export function assertSafeSeedTarget(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed demo data with NODE_ENV=production.");
  }

  const url = process.env.DATABASE_URL ?? "";
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    throw new Error("DATABASE_URL is missing or unparseable; refusing to seed.");
  }

  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  console.log(`Target database: ${host}${isLocal ? " (local)" : " (REMOTE)"}`);

  if (/prod/i.test(url)) {
    throw new Error("Refusing to seed demo data: DATABASE_URL looks like production.");
  }

  if (!isLocal && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      `Refusing to seed demo data into remote host ${host}.\n` +
        "This writes fake children, memories and community posts into a shared database.\n" +
        "If that is genuinely what you want, re-run with ALLOW_DEMO_SEED=1.",
    );
  }
}
