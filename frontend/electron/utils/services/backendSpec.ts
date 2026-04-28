import { get as httpGet } from "node:http";
import type { ServiceSpec } from "../serviceSupervisor";
import { tryStartBackend, stopBackend, type BackendStartOptions } from "../backendLauncher";

const BACKEND_PORT = 5050;
const HEALTH_INTERVAL_MS = 15_000;
const HEALTH_MAX_ATTEMPTS = 1;

const checkBackendHealth = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpGet(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });

export const makeBackendSpec = (
  userDataDir: string,
  options: BackendStartOptions = {}
): ServiceSpec => ({
  name: "backend",
  port: BACKEND_PORT,
  startFn: () => tryStartBackend(userDataDir, options),
  stopFn: () => stopBackend(),
  healthCheck: checkBackendHealth,
  healthIntervalMs: HEALTH_INTERVAL_MS,
  restartPolicy: "on-failure",
  maxRestarts: 3,
});

export type { BackendStartOptions };
export { BACKEND_PORT, HEALTH_MAX_ATTEMPTS };
