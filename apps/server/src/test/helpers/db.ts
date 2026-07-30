import prisma from "@bumpatlas/db";
import { env } from "@bumpatlas/env/server";

/**
 * Integration tests run against a real Postgres schema, because the behaviour
 * under test *is* database behaviour: unique constraints, transaction boundaries,
 * cascade rules, and index-backed ordering cannot be verified with a mocked client.
 */
export const TEST_SCHEMA = env.DATABASE_SCHEMA;

/**
 * Hard stop against the worst possible accident: this helper truncates every table
 * it can see, so it refuses to run anywhere but a schema explicitly named for
 * tests. Without this guard, one missing env var would empty the development
 * database.
 */
function assertTestSchema(): string {
  if (!TEST_SCHEMA || !TEST_SCHEMA.endsWith("_test")) {
    throw new Error(
      `Refusing to truncate: DATABASE_SCHEMA must be a *_test schema, got ${TEST_SCHEMA ?? "public"}. ` +
        "Run integration tests with --env-file=.env.test.",
    );
  }

  return TEST_SCHEMA;
}

let cachedTables: string[] | null = null;

async function listTables(schema: string): Promise<string[]> {
  if (cachedTables) return cachedTables;

  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = ${schema}
  `;

  cachedTables = rows
    .map((row) => row.tablename)
    .filter((name) => !name.startsWith("_prisma"));

  if (cachedTables.length === 0) {
    throw new Error(
      `No tables in schema "${schema}". Run: pnpm --filter server db:push:test`,
    );
  }

  return cachedTables;
}

/**
 * One TRUNCATE for all tables rather than per-table deletes: CASCADE handles
 * foreign keys in any order, and a single statement is fast enough to run before
 * every test, which is what keeps tests independent of execution order.
 *
 * Integration tests must therefore run serially — `--test-concurrency=1` in the
 * `test:integration` script. Node's test runner parallelises across *files* by
 * default, and with one shared schema that means one file truncating another
 * file's fixtures mid-test. If you see integration tests that pass alone and fail
 * together, this is why.
 *
 * The same hazard applies across *processes*: two `pnpm test:integration` runs at
 * once (a local run plus CI against the same schema, or two terminals) will truncate
 * each other's fixtures and produce failures that look like isolation bugs. One run
 * at a time per schema; give CI its own.
 */
export async function resetDatabase(): Promise<void> {
  const schema = assertTestSchema();
  const tables = await listTables(schema);
  const list = tables.map((table) => `"${schema}"."${table}"`).join(", ");

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
