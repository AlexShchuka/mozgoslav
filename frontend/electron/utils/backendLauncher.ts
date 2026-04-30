import { type ChildProcess, execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { get as httpGet } from "node:http";
import path from "node:path";

import { restartSearxng } from "./searxngLauncher";

const BACKEND_BINARY_NAME = "Mozgoslav.Api";
const BACKEND_PORT = 5050;

let backendProcess: ChildProcess | null = null;

const findPidsOnPort = (port: number): Promise<number[]> =>
  new Promise((resolve) => {
    if (process.platform === "win32") {
      resolve([]);
      return;
    }
    execFile("lsof", ["-ti", `tcp:${port}`], (err, stdout) => {
      if (err || !stdout) {
        resolve([]);
        return;
      }
      const pids = stdout
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((p) => Number.isInteger(p) && p !== process.pid);
      resolve(pids);
    });
  });

const killZombieOnPort = async (port: number): Promise<void> => {
  const pids = await findPidsOnPort(port);
  if (pids.length === 0) return;

  console.info(
    `[backendLauncher] port :${port} occupied by pid(s) ${pids.join(", ")} — sending SIGTERM`
  );
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const remaining = await findPidsOnPort(port);
    if (remaining.length === 0) return;
  }

  const stubborn = await findPidsOnPort(port);
  if (stubborn.length === 0) return;

  console.warn(
    `[backendLauncher] pid(s) ${stubborn.join(", ")} survived SIGTERM — sending SIGKILL`
  );
  for (const pid of stubborn) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {}
  }
  await new Promise((r) => setTimeout(r, 200));
};

export interface BackendStartOptions {
  readonly resourcesRoot?: string;
  readonly extraArgs?: readonly string[];
  readonly extraEnv?: Readonly<Record<string, string>>;
}

const isBackendAlive = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpGet(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });

export const tryStartBackend = async (
  userDataDir: string,
  options: BackendStartOptions = {}
): Promise<void> => {
  if (process.env.MOZGOSLAV_BACKEND_ATTACH === "1" || await isBackendAlive()) {
    console.info("[backendLauncher] backend already running on :5050, attaching");
    return;
  }

  const candidatePaths: string[] = [];
  if (options.resourcesRoot) {
    candidatePaths.push(
      path.join(options.resourcesRoot, "backend", BACKEND_BINARY_NAME),
      path.join(options.resourcesRoot, "backend", `${BACKEND_BINARY_NAME}.exe`)
    );
  }
  candidatePaths.push(
    path.join(userDataDir, "backend", BACKEND_BINARY_NAME),
    path.join(userDataDir, "backend", `${BACKEND_BINARY_NAME}.exe`)
  );

  const binaryPath = candidatePaths.find((p) => existsSync(p));

  if (!binaryPath) {
    console.info(
      "[backendLauncher] Bundled backend binary not found. " +
        "Assuming developer is running `dotnet run` manually on http://localhost:5050."
    );
    return;
  }

  await killZombieOnPort(BACKEND_PORT);

  try {
    backendProcess = spawn(binaryPath, [...(options.extraArgs ?? [])], {
      cwd: path.dirname(binaryPath),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(options.extraEnv ?? {}) },
    });

    backendProcess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      console.info(`[backend] ${text.trimEnd()}`);
      if (text.includes("MOZGOSLAV_EVENT:searxng-restart")) {
        restartSearxng().then(
          () => console.info("[backendLauncher] SearXNG restarted after settings save"),
          (err: unknown) => console.error("[backendLauncher] SearXNG restart failed:", err)
        );
      }
    });

    backendProcess.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[backend:err] ${chunk.toString().trimEnd()}`);
    });

    backendProcess.on("exit", (code, signal) => {
      console.info(`[backendLauncher] Backend exited (code=${code}, signal=${signal})`);
      backendProcess = null;
    });

    backendProcess.on("error", (err) => {
      console.error("[backendLauncher] Failed to start backend:", err);
      backendProcess = null;
    });
  } catch (err) {
    console.error("[backendLauncher] Unexpected error starting backend:", err);
  }
};

const BACKEND_STOP_GRACE_MS = 5000;

export const stopBackend = async (graceMs: number = BACKEND_STOP_GRACE_MS): Promise<void> => {
  const proc = backendProcess;
  backendProcess = null;
  if (!proc || proc.killed || proc.exitCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
  });

  try {
    proc.kill("SIGTERM");
  } catch (err) {
    console.error("[backendLauncher] Error sending SIGTERM:", err);
  }

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, graceMs));
  await Promise.race([exited, timeout]);

  if (proc.exitCode === null && !proc.killed) {
    console.warn(`[backendLauncher] Backend did not exit in ${graceMs}ms — sending SIGKILL`);
    try {
      proc.kill("SIGKILL");
    } catch (err) {
      console.error("[backendLauncher] Error sending SIGKILL:", err);
    }
    await Promise.race([exited, new Promise<void>((r) => setTimeout(r, 1000))]);
  }
};
