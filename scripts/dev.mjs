#!/usr/bin/env node
/**
 * One-liner dev orchestrator for Mozgoslav.
 *
 *   npm run dev
 *
 * Starts the .NET backend (dotnet run --project backend/src/Mozgoslav.Api) and
 * the Vite/Electron frontend (cd frontend && npm run dev) in parallel, piping
 * combined stdout/stderr with `[backend]` / `[frontend]` prefixes. Ctrl-C tears
 * down both cleanly.
 *
 * See ADR-006 D-12 for the rationale.
 */

import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const COLORS = {
  backend: "\u001b[36m",
  frontend: "\u001b[35m",
  reset: "\u001b[0m",
};

const prefix = (name) => `${COLORS[name] ?? ""}[${name}]${COLORS.reset} `;

const pipe = (name, stream) => {
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const trimmed = chunk.replace(/\n$/, "");
    for (const line of trimmed.split("\n")) {
      process.stdout.write(`${prefix(name)}${line}\n`);
    }
  });
};

const spawnChild = (name, command, args, cwd) => {
  const env = { ...process.env };
  if (name === "frontend") env.WATCHPACK_POLLING = "true";
  const child = spawn(command, args, { cwd, env });
  pipe(name, child.stdout);
  pipe(name, child.stderr);
  child.on("exit", (code) => {
    process.stdout.write(`${prefix(name)}exited with code ${code}\n`);
    if (code !== 0) {
      for (const other of children) {
        if (other !== child) other.kill("SIGTERM");
      }
      process.exit(code ?? 1);
    }
  });
  return child;
};

const children = [];
children.push(
  spawnChild(
    "backend",
    "dotnet",
    ["run", "--project", "src/Mozgoslav.Api", "-maxcpucount:1"],
    resolve(repoRoot, "backend"),
  ),
);
children.push(
  spawnChild("frontend", "npm", ["run", "dev"], resolve(repoRoot, "frontend")),
);

const shutdown = () => {
  for (const child of children) child.kill("SIGTERM");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
