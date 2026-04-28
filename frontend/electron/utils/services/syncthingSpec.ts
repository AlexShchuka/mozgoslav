import type { ServiceSpec } from "../serviceSupervisor";
import {
  tryStartSyncthing,
  stopSyncthing,
  getLastSyncthingConfig,
  type SyncthingLauncherOptions,
  type SyncthingConfig,
} from "../syncthingLauncher";

export interface SyncthingSpecCallbacks {
  onStarted?: (config: SyncthingConfig) => void;
}

export const makeSyncthingSpec = (
  options: SyncthingLauncherOptions,
  callbacks: SyncthingSpecCallbacks = {}
): ServiceSpec => ({
  name: "syncthing",
  startFn: async () => {
    const config = await tryStartSyncthing(options);
    if (config && callbacks.onStarted) {
      callbacks.onStarted(config);
    }
  },
  stopFn: () => stopSyncthing(),
  healthCheck: async () => {
    const config = getLastSyncthingConfig();
    if (!config) return false;
    try {
      const response = await fetch(`${config.baseUrl}/rest/system/ping`, {
        headers: { "X-API-Key": config.apiKey },
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
  healthIntervalMs: 30_000,
  restartPolicy: "on-failure",
  maxRestarts: 3,
});

export type { SyncthingLauncherOptions, SyncthingConfig };
