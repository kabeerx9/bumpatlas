import { cpSync, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  normalizeProjectConfig,
  STARTER_DEFAULTS,
  type ProjectConfig,
  type StarterDefaults,
} from "./project-config.ts";

export type InitOptions = {
  config: ProjectConfig;
  dryRun: boolean;
  yes: boolean;
  interactive: boolean;
};

export type PlannedChange = {
  path: string;
  action: "update" | "create";
};

const TEXT_REPLACEMENT_ROOTS = ["apps", "packages"] as const;
const ROOT_TEXT_REPLACEMENT_FILES = ["tsconfig.json", "README.md", "docs/reference-feature.md"] as const;
const TEXT_REPLACEMENT_FILE_PATTERN = /\.(css|html|json|mjs|ts|tsx)$/;
const TEXT_REPLACEMENT_IGNORED_DIRS = new Set(["node_modules", "dist", "build", ".turbo", ".vercel", "coverage"]);

function listTextReplacementPaths(repoRoot: string): string[] {
  const paths = new Set<string>();

  for (const relativePath of ROOT_TEXT_REPLACEMENT_FILES) {
    const absolutePath = join(repoRoot, relativePath);
    if (existsSync(absolutePath)) {
      paths.add(relativePath);
    }
  }

  for (const rootName of TEXT_REPLACEMENT_ROOTS) {
    const absoluteRoot = join(repoRoot, rootName);
    if (!existsSync(absoluteRoot)) {
      continue;
    }

    const stack = [absoluteRoot];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        if (TEXT_REPLACEMENT_IGNORED_DIRS.has(entry.name)) {
          continue;
        }

        const entryPath = join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
          continue;
        }

        const relativePath = relative(repoRoot, entryPath);
        if (entry.name === "package.json" || relativePath === "apps/native/app.json") {
          continue;
        }

        if (TEXT_REPLACEMENT_FILE_PATTERN.test(entry.name)) {
          paths.add(relativePath);
        }
      }
    }
  }

  return [...paths].sort();
}

const ENV_FILE_PAIRS = [
  { example: "apps/server/.env.example", target: "apps/server/.env" },
  { example: "apps/web/.env.example", target: "apps/web/.env" },
  { example: "apps/native/.env.example", target: "apps/native/.env" },
] as const;

const WORKSPACE_SCOPE_PATTERN = /(@[a-z0-9-]+)\/(?:config|db|env|ui)\b/g;

function collectWorkspaceScopesFromContent(content: string): Set<string> {
  const scopes = new Set<string>();

  const parsed = JSON.parse(content) as {
    name?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  if (typeof parsed.name === "string" && parsed.name.startsWith("@") && parsed.name.includes("/")) {
    scopes.add(parsed.name.split("/")[0]!);
  }

  for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const deps = parsed[section];
    if (!deps) {
      continue;
    }

    for (const [dependencyName, version] of Object.entries(deps)) {
      if (version === "workspace:*" && dependencyName.startsWith("@") && dependencyName.includes("/")) {
        scopes.add(dependencyName.split("/")[0]!);
      }
    }
  }

  return scopes;
}

function collectWorkspaceScopesFromText(content: string): Set<string> {
  const scopes = new Set<string>();
  for (const match of content.matchAll(WORKSPACE_SCOPE_PATTERN)) {
    scopes.add(match[1]!);
  }
  return scopes;
}

export function applyReplacements(
  content: string,
  config: ProjectConfig,
  defaults: StarterDefaults = STARTER_DEFAULTS,
): string {
  return content
    .replaceAll(defaults.packageScope, config.packageScope)
    .replaceAll(defaults.rootPackageName, config.slug)
    .replaceAll(defaults.bundleIdentifier, config.bundleIdentifier)
    .replaceAll(defaults.displayName, config.displayName)
    .replaceAll(defaults.scheme, config.scheme);
}

function listPackageJsonPaths(repoRoot: string): string[] {
  const paths = [join(repoRoot, "package.json")];

  for (const dir of ["apps", "packages"]) {
    const absoluteDir = join(repoRoot, dir);
    if (!existsSync(absoluteDir)) {
      continue;
    }

    for (const entry of readdirSync(absoluteDir)) {
      const packageJsonPath = join(absoluteDir, entry, "package.json");
      if (existsSync(packageJsonPath)) {
        paths.push(packageJsonPath);
      }
    }
  }

  return paths;
}

function updatePackageJson(content: string, config: ProjectConfig): string {
  const parsed = JSON.parse(content) as Record<string, unknown>;

  if (typeof parsed.name === "string") {
    parsed.name = applyReplacements(parsed.name, config);
  }

  for (const section of ["dependencies", "devDependencies", "peerDependencies"] as const) {
    const deps = parsed[section];
    if (!deps || typeof deps !== "object" || Array.isArray(deps)) {
      continue;
    }

    const nextDeps: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(deps as Record<string, unknown>)) {
      nextDeps[applyReplacements(key, config)] = value;
    }
    parsed[section] = nextDeps;
  }

  if (parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts)) {
    const nextScripts: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.scripts as Record<string, unknown>)) {
      nextScripts[key] =
        typeof value === "string" ? applyReplacements(value, config) : value;
    }
    parsed.scripts = nextScripts;
  }

  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function updateAppJson(content: string, config: ProjectConfig): string {
  const parsed = JSON.parse(content) as {
    expo: {
      name: string;
      slug: string;
      scheme: string;
      ios?: { bundleIdentifier?: string };
      android?: { package?: string };
    };
  };

  parsed.expo.name = config.displayName;
  parsed.expo.slug = config.slug;
  parsed.expo.scheme = config.scheme;

  if (parsed.expo.ios) {
    parsed.expo.ios.bundleIdentifier = config.bundleIdentifier;
  }

  if (parsed.expo.android) {
    parsed.expo.android.package = config.bundleIdentifier;
  }

  return `${applyReplacements(JSON.stringify(parsed, null, 2), config)}\n`;
}

function collectScopesFromContent(content: string): Set<string> {
  if (content.trimStart().startsWith("{")) {
    try {
      return collectWorkspaceScopesFromContent(content);
    } catch {
      return new Set<string>();
    }
  }

  return collectWorkspaceScopesFromText(content);
}

export function detectMixedPackageScopes(repoRoot: string): string[] {
  const packageScopes = new Set<string>();
  const textScopes = new Set<string>();
  const starterScope = STARTER_DEFAULTS.packageScope;

  for (const packageJsonPath of listPackageJsonPaths(repoRoot)) {
    const content = readFileSync(packageJsonPath, "utf8");
    for (const scope of collectScopesFromContent(content)) {
      packageScopes.add(scope);
    }
  }

  for (const relativePath of listTextReplacementPaths(repoRoot)) {
    const content = readFileSync(join(repoRoot, relativePath), "utf8");
    for (const scope of collectScopesFromContent(content)) {
      if (scope === starterScope || packageScopes.has(scope)) {
        textScopes.add(scope);
      }
    }
  }

  const scopes = new Set([...packageScopes, ...textScopes]);
  const nonStarterScopes = [...scopes].filter((scope) => scope !== starterScope);

  if (scopes.has(starterScope) && nonStarterScopes.length > 0) {
    return nonStarterScopes;
  }

  return [];
}

export function planInitChanges(repoRoot: string, config: ProjectConfig): PlannedChange[] {
  const changes: PlannedChange[] = [];

  for (const packageJsonPath of listPackageJsonPaths(repoRoot)) {
    const current = readFileSync(packageJsonPath, "utf8");
    const next =
      packageJsonPath.endsWith("apps/native/app.json") || packageJsonPath.endsWith("app.json")
        ? current
        : updatePackageJson(current, config);

    if (next !== current) {
      changes.push({
        path: relative(repoRoot, packageJsonPath),
        action: "update",
      });
    }
  }

  const appJsonPath = join(repoRoot, "apps/native/app.json");
  if (existsSync(appJsonPath)) {
    const current = readFileSync(appJsonPath, "utf8");
    const next = updateAppJson(current, config);
    if (next !== current) {
      changes.push({ path: relative(repoRoot, appJsonPath), action: "update" });
    }
  }

  for (const relativePath of listTextReplacementPaths(repoRoot)) {
    const filePath = join(repoRoot, relativePath);
    if (!existsSync(filePath)) {
      continue;
    }

    const current = readFileSync(filePath, "utf8");
    const next = applyReplacements(current, config);
    if (next !== current) {
      changes.push({ path: relativePath, action: "update" });
    }
  }

  for (const pair of ENV_FILE_PAIRS) {
    const examplePath = join(repoRoot, pair.example);
    const targetPath = join(repoRoot, pair.target);
    if (existsSync(examplePath) && !existsSync(targetPath)) {
      changes.push({ path: pair.target, action: "create" });
    }
  }

  return changes;
}

async function confirmChanges(changes: PlannedChange[]): Promise<boolean> {
  if (changes.length === 0) {
    return true;
  }

  console.log("Planned changes:");
  for (const change of changes) {
    console.log(`  ${change.action === "create" ? "create" : "update"} ${change.path}`);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Apply these changes? [y/N] ");
  rl.close();
  return answer.trim().toLowerCase() === "y";
}

export async function runInitProject(
  repoRoot: string,
  options: InitOptions,
): Promise<{ changes: PlannedChange[]; wroteChanges: boolean }> {
  const mixedScopes = detectMixedPackageScopes(repoRoot);
  if (mixedScopes.length > 0) {
    throw new Error(
      `Detected a mixture of starter and non-starter package scopes (${[
        STARTER_DEFAULTS.packageScope,
        ...mixedScopes,
      ].join(", ")}). Resolve the partial rename manually before running init:project again.`,
    );
  }

  const changes = planInitChanges(repoRoot, options.config);

  if (changes.length === 0) {
    console.log("No changes needed.");
    return { changes, wroteChanges: false };
  }

  if (options.dryRun) {
    console.log("Dry run. Planned changes:");
    for (const change of changes) {
      console.log(`  ${change.action === "create" ? "create" : "update"} ${change.path}`);
    }
    return { changes, wroteChanges: false };
  }

  if (options.interactive && !options.yes) {
    const confirmed = await confirmChanges(changes);
    if (!confirmed) {
      throw new Error("Initialization cancelled.");
    }
  }

  for (const packageJsonPath of listPackageJsonPaths(repoRoot)) {
    const current = readFileSync(packageJsonPath, "utf8");
    const next = updatePackageJson(current, options.config);
    if (next !== current) {
      writeFileSync(packageJsonPath, next, "utf8");
    }
  }

  const appJsonPath = join(repoRoot, "apps/native/app.json");
  if (existsSync(appJsonPath)) {
    const current = readFileSync(appJsonPath, "utf8");
    const next = updateAppJson(current, options.config);
    if (next !== current) {
      writeFileSync(appJsonPath, next, "utf8");
    }
  }

  for (const relativePath of listTextReplacementPaths(repoRoot)) {
    const filePath = join(repoRoot, relativePath);
    if (!existsSync(filePath)) {
      continue;
    }

    const current = readFileSync(filePath, "utf8");
    const next = applyReplacements(current, options.config);
    if (next !== current) {
      writeFileSync(filePath, next, "utf8");
    }
  }

  for (const pair of ENV_FILE_PAIRS) {
    const examplePath = join(repoRoot, pair.example);
    const targetPath = join(repoRoot, pair.target);
    if (existsSync(examplePath) && !existsSync(targetPath)) {
      cpSync(examplePath, targetPath);
    }
  }

  console.log("Initialization complete.");
  console.log("Run `pnpm install` to refresh workspace links after the package scope rename.");

  return { changes, wroteChanges: true };
}

export function printInitHelp(): void {
  console.log(`Usage: pnpm run init:project -- [options]

Options:
  --name <displayName>     Visible product name
  --slug <slug>            Root package and Expo slug
  --scope <packageScope>   Workspace npm scope (with or without @)
  --scheme <scheme>        Expo URL scheme
  --bundle-id <identifier> iOS bundle identifier and Android package
  --dry-run                Print planned changes without writing files
  --yes                    Apply changes without interactive confirmation
  --help                   Show this help message

Example:
  pnpm run init:project -- \\
    --name "Acme Tasks" \\
    --slug acme-tasks \\
    --scope acme-tasks \\
    --scheme acme-tasks \\
    --bundle-id com.acme.tasks`);
}

type ParsedCli = {
  help: boolean;
  dryRun: boolean;
  yes: boolean;
  config?: ProjectConfig;
};

function parseArgs(argv: string[]): ParsedCli {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const parsed: ParsedCli = {
    help: false,
    dryRun: false,
    yes: false,
  };

  const values: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }
    if (arg === "--yes" || arg === "-y") {
      parsed.yes = true;
      continue;
    }

    const inlineMatch = arg.match(/^--(name|slug|scope|scheme|bundle-id)=(.+)$/);
    if (inlineMatch) {
      values[inlineMatch[1]!] = inlineMatch[2]!;
      continue;
    }

    if (["--name", "--slug", "--scope", "--scheme", "--bundle-id"].includes(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      values[arg.slice(2)] = value;
      index += 1;
    }
  }

  if (!parsed.help) {
    const required = ["name", "slug", "scope", "scheme", "bundle-id"] as const;
    const missing = required.filter((key) => values[key] === undefined);
    if (missing.length > 0) {
      throw new Error(`Missing required option(s): ${missing.map((key) => `--${key}`).join(", ")}`);
    }

    parsed.config = normalizeProjectConfig({
      displayName: values.name!,
      slug: values.slug!,
      packageScope: values.scope!,
      scheme: values.scheme!,
      bundleIdentifier: values["bundle-id"]!,
    });
  }

  return parsed;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const parsed = parseArgs(argv);

    if (parsed.help) {
      printInitHelp();
      return 0;
    }

    const interactive = Boolean(process.stdin.isTTY);
    if (!interactive && !parsed.yes && !parsed.dryRun) {
      throw new Error(
        "Non-interactive mode requires --yes or --dry-run. Re-run with one of those flags to continue.",
      );
    }

    const repoRoot = fileURLToPath(new URL("..", import.meta.url));
    await runInitProject(repoRoot, {
      config: parsed.config!,
      dryRun: parsed.dryRun,
      yes: parsed.yes,
      interactive,
    });

    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])
) {
  const exitCode = await main();
  process.exit(exitCode);
}
