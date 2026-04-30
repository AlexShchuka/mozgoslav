import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveRepoRoot } from "./repoRoot";

const DEFAULT_READY_TIMEOUT_MS = 15_000;
const POLL_INTERVAL_MS = 100;

export interface SyncthingConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly homeDir: string;
}

export interface SyncthingLauncherOptions {
  readonly userDataDir: string;
  readonly resourcesRoot: string;
  readonly readyTimeoutMs?: number;
}

let syncthingProcess: ChildProcess | null = null;
let lastConfig: SyncthingConfig | null = null;

export const tryStartSyncthing = async (
  options: SyncthingLauncherOptions
): Promise<SyncthingConfig | null> => {
  const binaryPath = resolveBinaryPath(options.resourcesRoot);
  if (!binaryPath) {
    console.info(
      "[syncthingLauncher] Bundled Syncthing binary not found. Skipping child-process launch. " +
        "Set MOZGOSLAV_SYNCTHING_BIN to override for dev."
    );
    return null;
  }

  const home = path.join(options.userDataDir, "syncthing");

  try {
    syncthingProcess = spawn(
      binaryPath,
      ["serve", "--no-browser", "--no-restart", `--home=${home}`],
      {
        cwd: path.dirname(binaryPath),
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          STNOUPGRADE: "1",
        },
      }
    );

    syncthingProcess.stdout?.on("data", (chunk: Buffer) => {
      console.info(`[syncthing] ${chunk.toString().trimEnd()}`);
    });
    syncthingProcess.stderr?.on("data", (chunk: Buffer) => {
      console.error(`[syncthing:err] ${chunk.toString().trimEnd()}`);
    });
    syncthingProcess.on("exit", (code, signal) => {
      console.info(`[syncthingLauncher] Syncthing exited (code=${code}, signal=${signal})`);
      syncthingProcess = null;
    });
    syncthingProcess.on("error", (err) => {
      console.error("[syncthingLauncher] Failed to start Syncthing:", err);
      syncthingProcess = null;
    });

    const config = await waitForConfig(home, options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS);
    lastConfig = config;
    console.info(`[syncthingLauncher] Ready: ${config.baseUrl}`);
    return config;
  } catch (err) {
    console.error("[syncthingLauncher] Unexpected error starting Syncthing:", err);
    return null;
  }
};

export const stopSyncthing = async (): Promise<void> => {
  const proc = syncthingProcess;
  syncthingProcess = null;
  if (!proc || proc.killed) {
    return;
  }
  try {
    if (lastConfig) {
      await softShutdown(lastConfig).catch(() => undefined);
    }
    proc.kill("SIGTERM");
  } catch (err) {
    console.error("[syncthingLauncher] Error stopping Syncthing:", err);
  }
};

export const getLastSyncthingConfig = (): SyncthingConfig | null => lastConfig;

const resolveBinaryPath = (resourcesRoot: string): string | null => {
  const override = process.env.MOZGOSLAV_SYNCTHING_BIN;
  if (override && existsSync(override)) {
    return override;
  }

  const platformDir = resolvePlatformDir();
  if (!platformDir) {
    return null;
  }

  const binaryName = process.platform === "win32" ? "syncthing.exe" : "syncthing";
  const candidates: string[] = [];
  const repoRoot = resolveRepoRoot({
    dirname: __dirname,
    cwd: process.cwd(),
    env: process.env,
  });
  if (repoRoot) {
    candidates.push(
      path.join(repoRoot, "frontend", "resources", "syncthing", platformDir, binaryName)
    );
  }
  candidates.push(path.join(resourcesRoot, "syncthing", platformDir, binaryName));
  candidates.push(
    path.join(resourcesRoot, "..", "resources", "syncthing", platformDir, binaryName)
  );
  candidates.push(
    path.join(process.cwd(), "frontend", "resources", "syncthing", platformDir, binaryName)
  );
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
};

const resolvePlatformDir = (): string | null => {
  const platform = process.platform;
  const arch = process.arch;
  if (platform === "darwin" && arch === "arm64") return "darwin-arm64";
  if (platform === "darwin" && arch === "x64") return "darwin-amd64";
  if (platform === "linux" && arch === "x64") return "linux-amd64";
  if (platform === "linux" && arch === "arm64") return "linux-arm64";
  if (platform === "win32" && arch === "x64") return "windows-amd64";
  return null;
};

const waitForConfig = async (home: string, timeoutMs: number): Promise<SyncthingConfig> => {
  const configPath = path.join(home, "config.xml");
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    if (existsSync(configPath)) {
      try {
        const parsed = parseConfig(configPath, home);
        if (parsed) {
          return parsed;
        }
      } catch (err) {
        lastError = err;
      }
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `Syncthing did not emit a parseable config.xml within ${timeoutMs}ms` +
      (lastError ? `; lastError=${String(lastError)}` : "")
  );
};

export const parseConfig = (configPath: string, home: string): SyncthingConfig | null => {
  const xml = readFileSync(configPath, "utf8");
  const apiKey = extractTag(xml, "apikey");
  const address = extractTag(xml, "address") ?? "127.0.0.1:8384";
  if (!apiKey) {
    return null;
  }
  const baseUrl = address.startsWith("http") ? address : `http://${address}`;
  return { apiKey, baseUrl, homeDir: home };
};

const extractTag = (xml: string, tag: string): string | null => {
  const match = new RegExp(`<${tag}>([^<]+)</${tag}>`).exec(xml);
  return match ? match[1].trim() : null;
};

const softShutdown = async (config: SyncthingConfig): Promise<void> => {
  await fetch(`${config.baseUrl}/rest/system/shutdown`, {
    method: "POST",
    headers: { "X-API-Key": config.apiKey },
  });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
