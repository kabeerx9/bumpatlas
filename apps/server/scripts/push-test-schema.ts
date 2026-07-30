import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

/**
 * Applies the Prisma schema to the integration-test Postgres schema.
 *
 * `override: true` matters: `packages/db/prisma.config.ts` loads
 * `apps/server/.env` and dotenv does not overwrite variables that are already
 * set, so exporting the test values here is what makes the CLI target
 * `bumpatlas_test` instead of `public`.
 */
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbDir = path.resolve(serverDir, "../../packages/db");

const result = dotenv.config({ path: path.join(serverDir, ".env.test"), override: true });

if (result.error) {
  console.error(
    "Missing apps/server/.env.test. Copy .env.test.example and point it at a scratch database or schema.",
  );
  process.exit(1);
}

const schema = process.env.DATABASE_SCHEMA;

if (!schema || !schema.endsWith("_test")) {
  console.error(
    `DATABASE_SCHEMA must be a *_test schema, got ${schema ?? "(unset)"}. Refusing to push.`,
  );
  process.exit(1);
}

console.log(`Applying schema to "${schema}"...`);

const push = spawnSync("pnpm", ["exec", "prisma", "db", "push"], {
  cwd: dbDir,
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(push.status ?? 1);
