import type { RuntimeState } from "../../../api/gql/graphql";

export interface MonitoringState {
  runtimeState: RuntimeState | null;
  isLoading: boolean;
  isSubscribed: boolean;
  isReprobing: boolean;
  error: string | null;
}

export const initialMonitoringState: MonitoringState = {
  runtimeState: null,
  isLoading: false,
  isSubscribed: false,
  isReprobing: false,
  error: null,
};
