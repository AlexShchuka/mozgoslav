import { get as httpGet } from "node:http";
import type { ServiceSpec } from "../serviceSupervisor";
import { tryStartSearxng, stopSearxng, type SearxngStartOptions } from "../searxngLauncher";

const SEARXNG_PORT = 8888;
const HEALTH_INTERVAL_MS = 20_000;

const checkSearxngHealth = (): Promise<boolean> =>
  new Promise((resolve) => {
    const req = httpGet(`http://127.0.0.1:${SEARXNG_PORT}/`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });

export const makeSearxngSpec = (options: SearxngStartOptions): ServiceSpec => ({
  name: "searxng-sidecar",
  port: SEARXNG_PORT,
  startFn: () => tryStartSearxng(options),
  stopFn: () => stopSearxng(),
  healthCheck: checkSearxngHealth,
  healthIntervalMs: HEALTH_INTERVAL_MS,
  restartPolicy: "on-failure",
  maxRestarts: 3,
});

export { SEARXNG_PORT };
