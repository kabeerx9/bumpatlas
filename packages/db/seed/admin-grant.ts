import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Grants superadmin access to a Clerk user by merging their id into
 * `ADMIN_USER_IDS` in `apps/server/.env`.
 *
 *   pnpm --filter @bumpatlas/db admin:grant <clerkUserId>
 *
 * There is no admin flag in the database — `require-auth.ts` reads
 * `env.ADMIN_USER_IDS` (parsed in packages/env/src/server.ts) on every request, so
 * granting access is purely an env-file edit. This script never touches Postgres and
 * never prints any other line from the `.env` file: only the merged `ADMIN_USER_IDS`
 * value, so it is safe to paste this script's output into a chat or a ticket.
 */

const CLERK_ID_PATTERN = /^user_[A-Za-z0-9]+$/;
const ENV_KEY = "ADMIN_USER_IDS";

function parseArgs(): { clerkUserId: string } {
  const clerkUserId = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

  if (!clerkUserId) {
    console.error("Usage: admin:grant <clerkUserId>");
    process.exit(1);
  }

  if (!CLERK_ID_PATTERN.test(clerkUserId)) {
    console.error(
      `"${clerkUserId}" does not look like a Clerk user id (expected a "user_" prefix).`,
    );
    process.exit(1);
  }

  return { clerkUserId };
}

/** Splits a comma-separated env value into a trimmed, deduplicated, order-preserving list. */
function parseIdList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function main(): void {
  const { clerkUserId } = parseArgs();

  const seedDir = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(seedDir, "../../../apps/server/.env");

  const contents = readFileSync(envPath, "utf8");
  const lines = contents.split("\n");

  const lineIndex = lines.findIndex((line) => line.startsWith(`${ENV_KEY}=`));
  const rawValue = lineIndex === -1 ? "" : lines[lineIndex]!.slice(ENV_KEY.length + 1);
  // Strip a single layer of surrounding quotes, matching how the rest of the file is written.
  const unquoted = rawValue.replace(/^"(.*)"$/, "$1");

  const existingIds = parseIdList(unquoted);
  const merged = [...new Set([...existingIds, clerkUserId])];
  const mergedList = merged.join(",");
  const newLine = `${ENV_KEY}="${mergedList}"`;

  if (lineIndex === -1) {
    lines.push(newLine);
  } else {
    lines[lineIndex] = newLine;
  }

  writeFileSync(envPath, lines.join("\n"));

  console.log(newLine);
  console.log("");
  console.log("Reminders:");
  console.log("  - Restart the local server so it picks up the new ADMIN_USER_IDS value.");
  console.log("  - Push this to production, then redeploy:");
  console.log("");
  console.log(`      printf '${mergedList}' | vercel env add ADMIN_USER_IDS production --force`);
  console.log("");
}

main();
