import type { BackendHealthStatus } from "./types";

export const HEALTH_PROBE_REQUESTED = "health/PROBE_REQUESTED";
export const HEALTH_PROBE_RESULT = "health/PROBE_RESULT";

export interface HealthProbeRequestedAction {
  type: typeof HEALTH_PROBE_REQUESTED;
}

export interface HealthProbeResultAction {
  type: typeof HEALTH_PROBE_RESULT;
  payload: { status: BackendHealthStatus; lastCheckedAt: string };
}

export type HealthAction = HealthProbeRequestedAction | HealthProbeResultAction;

export const healthProbeRequested = (): HealthProbeRequestedAction => ({
  type: HEALTH_PROBE_REQUESTED,
});

export const healthProbeResult = (
  status: BackendHealthStatus,
  lastCheckedAt: string
): HealthProbeResultAction => ({
  type: HEALTH_PROBE_RESULT,
  payload: { status, lastCheckedAt },
});
