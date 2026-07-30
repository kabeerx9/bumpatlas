import { env } from "@bumpatlas/env/server";

/**
 * Schema-qualifies a table name for raw SQL.
 *
 * Prisma's query builder prefixes the configured schema automatically, but
 * `$queryRaw` is passed through verbatim — so an unqualified `"FamilyInvite"` in raw
 * SQL resolves through `search_path` instead. Under integration tests that means the
 * statement silently reads the *development* schema while every other query in the
 * same transaction reads the test schema: a `SELECT ... FOR UPDATE` finds nothing,
 * the row it was supposed to lock is unlocked, and the test fails for a reason that
 * has nothing to do with the logic under test.
 *
 * Identifiers cannot be parameterized in SQL, so this interpolates. The value comes
 * from server env, never from a request, and is validated below.
 */
const SCHEMA = env.DATABASE_SCHEMA ?? "public";

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(SCHEMA)) {
  throw new Error(`DATABASE_SCHEMA is not a valid identifier: ${SCHEMA}`);
}

export function table(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Not a valid table identifier: ${name}`);
  }

  return `"${SCHEMA}"."${name}"`;
}
