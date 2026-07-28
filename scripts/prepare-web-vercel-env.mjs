import { existsSync, readFileSync, writeFileSync } from "node:fs";

const webEnvPath = new URL("../apps/web/.env", import.meta.url);
const vercelEnvPath = new URL(
  "../apps/web/.vercel/.env.production.local",
  import.meta.url,
);

function parseEnv(contents) {
  const values = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

const localWebEnv = parseEnv(readFileSync(webEnvPath, "utf8"));
const values = {
  VITE_SERVER_URL:
    process.env.VITE_SERVER_URL ?? localWebEnv.VITE_SERVER_URL,
  VITE_CLERK_PUBLISHABLE_KEY:
    process.env.VITE_CLERK_PUBLISHABLE_KEY ??
    localWebEnv.VITE_CLERK_PUBLISHABLE_KEY,
};

let vercelEnv = existsSync(vercelEnvPath)
  ? readFileSync(vercelEnvPath, "utf8")
  : "";

for (const [key, value] of Object.entries(values)) {
  if (!value || value === '""') {
    throw new Error(`${key} is empty. Check apps/web/.env before building.`);
  }

  const line = `${key}=${JSON.stringify(value)}`;
  const matcher = new RegExp(`^${key}=.*$`, "m");

  vercelEnv = matcher.test(vercelEnv)
    ? vercelEnv.replace(matcher, line)
    : `${vercelEnv.trimEnd()}\n${line}\n`;

  console.log(`${key} prepared for local Vercel build (len=${value.length})`);
}

writeFileSync(vercelEnvPath, vercelEnv);
