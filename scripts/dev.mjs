#!/usr/bin/env node
/**
 * One-liner dev orchestrator for Mozgoslav (ADR-006 D-12).
 *
 *   npm run dev
 *
 * Starts — in parallel, with combined log prefixes — the .NET backend, the
 * Python FastAPI sidecar (`uvicorn app.main:app --reload --port 5060`), and
 * the Vite/Electron frontend. `WATCHPACK_POLLING=true` is scoped to the
 * frontend process per the workspace rule. Ctrl-C tears everything down.
 *
 * The sidecar is skipped gracefully if no python / venv is available so
 * contributors without the ML toolchain still get a usable dev loop.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const COLORS = {
  backend: "\u001b[36m",
  frontend: "\u001b[35m",
  sidecar: "\u001b[33m",
  reset: "\u001b[0m",
};

const prefix = (name) => `${COLORS[name] ?? ""}[${name}]${COLORS.reset} `;

const pipe = (name, stream) => {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    for (const line of chunk.replace(/\n$/, "").split("\n")) {
      process.stdout.write(`${prefix(name)}${line}\n`);
    }
  });
};

const children = [];

const spawnChild = (name, command, args, cwd) => {
  const env = { ...process.env };
  if (name === "frontend") env.WATCHPACK_POLLING = "true";
  const child = spawn(command, args, { cwd, env });
  pipe(name, child.stdout);
  pipe(name, child.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix(name)}exited with code ${code}\n`);
    if (code !== 0) {
      for (const other of children) if (other !== child) other.kill("SIGTERM");
      process.exit(code ?? 1);
    }
  });
  children.push(child);
  return child;
};

spawnChild(
  "backend",
  "dotnet",
  ["run", "--project", "src/Mozgoslav.Api", "-maxcpucount:1"],
  resolve(repoRoot, "backend"),
);
spawnChild("frontend", "npm", ["run", "dev"], resolve(repoRoot, "frontend"));

const sidecarRoot = resolve(repoRoot, "python-sidecar");
if (existsSync(resolve(sidecarRoot, "app", "main.py"))) {
  spawnChild(
    "sidecar",
    "python3",
    ["-m", "uvicorn", "app.main:app", "--reload", "--port", "5060"],
    sidecarRoot,
  );
} else {
  process.stdout.write(`${prefix("sidecar")}python-sidecar/app/main.py missing — skipping\n`);
}

const shutdown = () => children.forEach((c) => c.kill("SIGTERM"));
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
