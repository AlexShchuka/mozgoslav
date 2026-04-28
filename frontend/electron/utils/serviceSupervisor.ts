import { execFile } from "node:child_process";

export type RestartPolicy = "always" | "on-failure" | "never";

export interface ServiceSpec {
  readonly name: string;
  readonly port?: number;
  readonly startFn: () => Promise<void>;
  readonly stopFn: () => Promise<void>;
  readonly healthCheck?: () => Promise<boolean>;
  readonly restartPolicy: RestartPolicy;
  readonly healthIntervalMs?: number;
  readonly maxRestarts?: number;
}

interface ManagedService {
  readonly spec: ServiceSpec;
  restartCount: number;
  healthTimer: ReturnType<typeof setInterval> | null;
  stopped: boolean;
}

const findPidsOnPort = (port: number): Promise<number[]> =>
  new Promise((resolve) => {
    if (process.platform === "win32") {
      resolve([]);
      return;
    }
    execFile("lsof", ["-ti", `tcp:${port}`], (_err, stdout) => {
      if (!stdout) {
        resolve([]);
        return;
      }
      const pids = stdout
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((p) => Number.isInteger(p) && p > 0 && p !== process.pid);
      resolve(pids);
    });
  });

const killPids = async (pids: number[], signal: NodeJS.Signals): Promise<void> => {
  for (const pid of pids) {
    try {
      process.kill(pid, signal);
    } catch {}
  }
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export class ServiceSupervisor {
  private readonly services: ManagedService[] = [];
  private globalStopped = false;

  register(spec: ServiceSpec): void {
    this.services.push({
      spec,
      restartCount: 0,
      healthTimer: null,
      stopped: false,
    });
  }

  async cleanupZombies(): Promise<void> {
    const portsToClean = this.services.flatMap((s) => (s.spec.port !== undefined ? [s.spec.port] : []));
    for (const port of portsToClean) {
      const pids = await findPidsOnPort(port);
      if (pids.length === 0) continue;
      console.info(
        `[supervisor] port :${port} occupied by pid(s) ${pids.join(", ")} — sending SIGTERM`
      );
      await killPids(pids, "SIGTERM");
      for (let i = 0; i < 30; i++) {
        await sleep(100);
        const remaining = await findPidsOnPort(port);
        if (remaining.length === 0) break;
      }
      const stubborn = await findPidsOnPort(port);
      if (stubborn.length > 0) {
        console.warn(
          `[supervisor] pid(s) ${stubborn.join(", ")} survived SIGTERM on :${port} — sending SIGKILL`
        );
        await killPids(stubborn, "SIGKILL");
        await sleep(200);
      }
    }
  }

  async startAll(): Promise<void> {
    this.globalStopped = false;
    await this.cleanupZombies();
    for (const managed of this.services) {
      managed.stopped = false;
      await this.startService(managed);
    }
  }

  async stopAll(): Promise<void> {
    this.globalStopped = true;
    const reversed = [...this.services].reverse();
    for (const managed of reversed) {
      managed.stopped = true;
      if (managed.healthTimer !== null) {
        clearInterval(managed.healthTimer);
        managed.healthTimer = null;
      }
    }
    await Promise.allSettled(reversed.map((m) => m.spec.stopFn()));
  }

  private async startService(managed: ManagedService): Promise<void> {
    const { spec } = managed;
    try {
      await spec.startFn();
      console.info(`[supervisor] started: ${spec.name}`);
    } catch (err) {
      console.error(`[supervisor] failed to start ${spec.name}:`, err);
    }
    if (spec.healthCheck && spec.healthIntervalMs) {
      this.scheduleHealthLoop(managed);
    }
  }

  private scheduleHealthLoop(managed: ManagedService): void {
    const { spec } = managed;
    const intervalMs = spec.healthIntervalMs ?? 10_000;
    const maxRestarts = spec.maxRestarts ?? 5;

    if (managed.healthTimer !== null) {
      clearInterval(managed.healthTimer);
    }

    managed.healthTimer = setInterval(() => {
      if (managed.stopped || this.globalStopped) {
        clearInterval(managed.healthTimer!);
        managed.healthTimer = null;
        return;
      }

      void (async () => {
        try {
          const healthy = await spec.healthCheck!();
          if (!healthy) {
            console.warn(`[supervisor] health check failed for ${spec.name}`);
            await this.handleUnhealthy(managed, maxRestarts);
          }
        } catch {
          await this.handleUnhealthy(managed, maxRestarts);
        }
      })();
    }, intervalMs);
  }

  private async handleUnhealthy(managed: ManagedService, maxRestarts: number): Promise<void> {
    const { spec } = managed;
    if (managed.stopped || this.globalStopped) return;
    if (spec.restartPolicy === "never") {
      console.warn(`[supervisor] ${spec.name} is unhealthy and restart policy is 'never'. Skipping.`);
      return;
    }
    if (spec.restartPolicy === "on-failure" && managed.restartCount >= maxRestarts) {
      console.error(
        `[supervisor] ${spec.name} exceeded max restarts (${maxRestarts}). Giving up.`
      );
      managed.stopped = true;
      return;
    }
    managed.restartCount += 1;
    console.info(
      `[supervisor] restarting ${spec.name} (attempt ${managed.restartCount}/${maxRestarts})`
    );
    try {
      await spec.stopFn();
    } catch {}
    await sleep(1000);
    if (!managed.stopped && !this.globalStopped) {
      await this.startService(managed);
    }
  }
}
