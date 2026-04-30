import type { RuntimeState } from "../../api/gql/graphql";

export interface MonitoringStateProps {
  readonly runtimeState: RuntimeState | null;
  readonly isLoading: boolean;
  readonly isReprobing: boolean;
  readonly error: string | null;
}

export interface MonitoringDispatchProps {
  readonly onReprobe: () => void;
}

export type MonitoringProps = MonitoringStateProps & MonitoringDispatchProps;
