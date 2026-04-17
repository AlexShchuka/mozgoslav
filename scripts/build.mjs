#!/usr/bin/env node
/**
 * Production build for Mozgoslav (ADR-006 D-12).
 *
 *   npm run build
 *
 * Sequential pipeline, exits non-zero on first failure:
 *   1. backend   — `dotnet publish -c Release -maxcpucount:1 -o backend/publish`
 *   2. sidecar   — vendors the FastAPI sidecar into `python-sidecar/vendor/`
 *                  via `pip install --target`, skipped if python3 is missing
 *   3. frontend  — `npm run build` (tsc --noEmit + vite build)
 *   4. dmg       — `npm --prefix frontend run dist:mac` (macOS hosts only,
 *                  guarded by process.platform === "darwin")
 *
 * Signing the .dmg needs a Developer ID cert on the host; CI builds on Linux
 * get the first three stages and stop cleanly.
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
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

// 1. Backend publish — full self-contained layout under backend/publish/.
const publishDir = resolve(repoRoot, "backend", "publish");
if (existsSync(publishDir)) rmSync(publishDir, { recursive: true, force: true });
run(
  "backend",
  "dotnet",
  ["publish", "src/Mozgoslav.Api", "-c", "Release", "-maxcpucount:1", "-o", publishDir, "--nologo"],
  resolve(repoRoot, "backend"),
);

// 2. Sidecar vendor — pip install --target so electron-builder can ship a
//    self-contained site-packages alongside the asar.
const sidecarRoot = resolve(repoRoot, "python-sidecar");
const vendorDir = resolve(sidecarRoot, "vendor");
if (existsSync(resolve(sidecarRoot, "requirements.txt"))) {
  if (existsSync(vendorDir)) rmSync(vendorDir, { recursive: true, force: true });
  const probe = spawnSync("python3", ["--version"], { stdio: "ignore" });
  if (probe.status === 0) {
    run(
      "sidecar",
      "python3",
      ["-m", "pip", "install", "-r", "requirements.txt", "--target", vendorDir, "--upgrade"],
      sidecarRoot,
    );
  } else {
    console.log("sidecar: python3 not available, skipping vendor install");
  }
}

// 3. Frontend — tsc + vite into frontend/dist.
run("frontend", "npm", ["run", "build"], resolve(repoRoot, "frontend"));

// 4. DMG — macOS only. Skipped elsewhere to keep CI green.
if (process.platform === "darwin") {
  run("dmg", "npm", ["--prefix", "frontend", "run", "dist:mac"], repoRoot);
} else {
  console.log("\ndmg: skipped (electron-builder --mac requires a macOS host).");
}

console.log("\nAll builds green.");
