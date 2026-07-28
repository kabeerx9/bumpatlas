import path from "node:path";

import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({
  path: "../../apps/server/.env",
});

const isGenerateCommand = process.argv.some((arg) => arg === "generate");
const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  (isGenerateCommand
    ? "postgresql://postgres:postgres@localhost:5432/app_starter"
    : undefined);

if (!datasourceUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL is required for Prisma database commands.");
}

export default defineConfig({
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Use direct connection for CLI (db push, migrate, studio).
    // Runtime Prisma Client uses the pooled DATABASE_URL via the pg adapter.
    // Package installs only need prisma generate, which does not connect.
    url: datasourceUrl,
  },
});
