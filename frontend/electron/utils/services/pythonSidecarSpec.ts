import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { get as httpGet } from "node:http";
import path from "node:path";
import { resolveRepoRoot } from "../repoRoot";
import type { ServiceSpec } from "../serviceSupervisor";

const PYTHON_SIDECAR_PORT = 5060;
const HEALTH_INTERVAL_MS = 15_000;

let pythonProcess: ChildProcess | null = null;

const resolveLaunchScript = (resourcesRoot: string): string | null => {
  const candidates: string[] = [];
  const repoRoot = resolveRepoRoot({
    dirname: __dirname,
    cwd: process.cwd(),
    env: process.env,
  });
  if (repoRoot) {
    candidates.push(path.join(repoRoot, "python-sidecar", "launch.sh"));
  }
  candidates.push(path.join(resourcesRoot, "python-sidecar", "launch.sh"));
  candidates.push(path.join(process.cwd(), "python-sidecar", "launch.sh"));
  return candidates.find((p) => existsSync(p)) ?? null;
};

const startPythonSidecar = async (resourcesRoot: string): Promise<void> => {
  const launchScript = resolveLaunchScript(resourcesRoot);
  if (!launchScript) {
    console.info("[pythonSidecar] launch.sh not found. Python sidecar disabled.");
    return;
  }

  pythonProcess = spawn("bash", [launchScript], {
    cwd: path.dirname(launchScript),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });

  pythonProcess.stdout?.on("data", (chunk: Buffer) => {
    console.info(`[python-sidecar] ${chunk.toString().trimEnd()}`);
  });
  pythonProcess.stderr?.on("data", (chunk: Buffer) => {
    console.error(`[python-sidecar:err] ${chunk.toString().trimEnd()}`);
  });
  pythonProcess.on("exit", (code, signal) => {
    console.info(`[pythonSidecar] exited (code=${code}, signal=${signal})`);
    pythonProcess = null;
  });
  pythonProcess.on("error", (err) => {
    console.error("[pythonSidecar] Failed to start:", err);
    pythonProcess = null;
  });
};

const stopPythonSidecar = async (graceMs = 5000): Promise<void> => {
  const proc = pythonProcess;
  pythonProcess = null;
  if (!proc || proc.killed || proc.exitCode !== null) return;

  const exited = new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
  });

  try {
    proc.kill("SIGTERM");
  } catch {}

  await Promise.race([exited, new Promise<void>((r) => setTimeout(r, graceMs))]);

  if (proc.exitCode === null && !proc.killed) {
    try {
      proc.kill("SIGKILL");
    } catch {}
    await Promise.race([exited, new Promise<void>((r) => setTimeout(r, 1000))]);
  }
};

const checkPythonHealth = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpGet(`http://127.0.0.1:${PYTHON_SIDECAR_PORT}/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });

export const makePythonSidecarSpec = (resourcesRoot: string): ServiceSpec => ({
  name: "python-sidecar",
  port: PYTHON_SIDECAR_PORT,
  startFn: () => startPythonSidecar(resourcesRoot),
  stopFn: () => stopPythonSidecar(),
  healthCheck: checkPythonHealth,
  healthIntervalMs: HEALTH_INTERVAL_MS,
  restartPolicy: "on-failure",
  maxRestarts: 3,
});

export { PYTHON_SIDECAR_PORT };
