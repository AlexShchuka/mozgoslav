export type BackendHealthStatus = "unknown" | "ok" | "down";

export interface HealthState {
  readonly status: BackendHealthStatus;
  readonly lastCheckedAt: string | null;
}

export const initialHealthState: HealthState = {
  status: "unknown",
  lastCheckedAt: null,
};
