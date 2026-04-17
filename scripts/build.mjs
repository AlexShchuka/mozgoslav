#!/usr/bin/env node
/**
 * One-liner production build for Mozgoslav.
 *
 *   npm run build
 *
 * Runs backend `dotnet build -c Release -maxcpucount:1` and frontend
 * `npm run build` (tsc --noEmit + vite build). Exits non-zero on the first
 * failure. Does NOT package the .dmg — that requires a macOS host and is
 * driven by `npm --prefix frontend run dist:mac` on demand.
 *
 * See ADR-006 D-12 for the rationale.
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const run = (label, command, args, cwd) => {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    console.error(`${label} failed with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
};

run(
  "backend",
  "dotnet",
  ["build", "-c", "Release", "-maxcpucount:1", "--nologo"],
  resolve(repoRoot, "backend"),
);
run("frontend", "npm", ["run", "build"], resolve(repoRoot, "frontend"));

console.log("\nAll builds green.");
