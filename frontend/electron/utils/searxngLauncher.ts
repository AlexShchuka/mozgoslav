import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { get as httpGet } from "node:http";
import path from "node:path";
import { resolveRepoRoot } from "./repoRoot";

const SEARXNG_PORT = 8888;
const HEALTH_PATH = "/";
const HEALTH_POLL_MS = 500;
const HEALTH_MAX_ATTEMPTS = 20;

let searxngProcess: ChildProcess | null = null;
let lastStartOptions: SearxngStartOptions | null = null;

const pollHealthz = (): Promise<boolean> =>
  new Promise((resolve) => {
    let attempts = 0;

    const tryOnce = () => {
      attempts++;
      const req = httpGet(`http://127.0.0.1:${SEARXNG_PORT}${HEALTH_PATH}`, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      });
      req.on("error", () => {
        if (attempts >= HEALTH_MAX_ATTEMPTS) {
          resolve(false);
          return;
        }
        setTimeout(tryOnce, HEALTH_POLL_MS);
      });
      req.setTimeout(400, () => {
        req.destroy();
        if (attempts >= HEALTH_MAX_ATTEMPTS) {
          resolve(false);
          return;
        }
        setTimeout(tryOnce, HEALTH_POLL_MS);
      });
    };

    tryOnce();
  });

export interface SearxngStartOptions {
  readonly resourcesRoot?: string;
  readonly userDataDir: string;
}

export const tryStartSearxng = async (options: SearxngStartOptions): Promise<void> => {
  lastStartOptions = options;
  const candidatePaths: string[] = [];
  const repoRoot = resolveRepoRoot({
    dirname: __dirname,
    cwd: process.cwd(),
    env: process.env,
  });
  if (repoRoot) {
    candidatePaths.push(path.join(repoRoot, "searxng-sidecar", "launch.sh"));
  }
  if (options.resourcesRoot) {
    candidatePaths.push(path.join(options.resourcesRoot, "searxng-sidecar", "launch.sh"));
  }
  candidatePaths.push(path.join(options.userDataDir, "searxng-sidecar", "launch.sh"));
  candidatePaths.push(
    path.join(process.resourcesPath ?? "", "app.asar.unpacked", "searxng-sidecar", "launch.sh")
  );

  const launchScript = candidatePaths.find((p) => existsSync(p));

  if (!launchScript) {
    console.info("[searxngLauncher] launch.sh not found. SearXNG sidecar disabled.");
    return;
  }

  try {
    searxngProcess = spawn("bash", [launchScript], {
      cwd: path.dirname(launchScript),
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        MOZGOSLAV_APP_SUPPORT: options.userDataDir,
      },
    });

    searxngProcess.stdout?.on("data", (chunk: Buffer) => {
      console.info(`[searxng] ${chunk.toString().trimEnd()}`);
    });

    searxngProcess.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[searxng:err] ${chunk.toString().trimEnd()}`);
    });

    searxngProcess.on("exit", (code, signal) => {
      console.info(`[searxngLauncher] SearXNG exited (code=${code}, signal=${signal})`);
      searxngProcess = null;
    });

    searxngProcess.on("error", (err) => {
      console.error("[searxngLauncher] Failed to start SearXNG:", err);
      searxngProcess = null;
    });

    const healthy = await pollHealthz();
    if (healthy) {
      console.info(`[searxngLauncher] SearXNG ready on :${SEARXNG_PORT}`);
    } else {
      console.warn(
        `[searxngLauncher] SearXNG did not become healthy after ${HEALTH_MAX_ATTEMPTS} attempts`
      );
    }
  } catch (err) {
    console.error("[searxngLauncher] Unexpected error starting SearXNG:", err);
  }
};

const SEARXNG_STOP_GRACE_MS = 3000;

export const stopSearxng = async (graceMs: number = SEARXNG_STOP_GRACE_MS): Promise<void> => {
  const proc = searxngProcess;
  searxngProcess = null;
  if (!proc || proc.killed || proc.exitCode !== null) {
    return;
  }

  const exited = new Promise<void>((resolve) => {
    proc.once("exit", () => resolve());
  });

  try {
    proc.kill("SIGTERM");
  } catch (err) {
    console.error("[searxngLauncher] Error sending SIGTERM:", err);
  }

  const timeout = new Promise<void>((resolve) => setTimeout(resolve, graceMs));
  await Promise.race([exited, timeout]);

  if (proc.exitCode === null && !proc.killed) {
    console.warn(`[searxngLauncher] SearXNG did not exit in ${graceMs}ms — sending SIGKILL`);
    try {
      proc.kill("SIGKILL");
    } catch (err) {
      console.error("[searxngLauncher] Error sending SIGKILL:", err);
    }
    await Promise.race([exited, new Promise<void>((r) => setTimeout(r, 1000))]);
  }
};

export const restartSearxng = async (): Promise<void> => {
  if (!lastStartOptions) {
    console.info("[searxngLauncher] restartSearxng called before tryStartSearxng — no-op");
    return;
  }
  const opts = lastStartOptions;
  await stopSearxng();
  await tryStartSearxng(opts);
};
