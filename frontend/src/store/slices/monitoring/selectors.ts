import type { GlobalState } from "../../index";

export const selectMonitoringRuntimeState = (state: GlobalState) => state.monitoring.runtimeState;

export const selectMonitoringIsLoading = (state: GlobalState) => state.monitoring.isLoading;

export const selectMonitoringIsReprobing = (state: GlobalState) => state.monitoring.isReprobing;

export const selectMonitoringError = (state: GlobalState) => state.monitoring.error;

export const selectMonitoringIsSubscribed = (state: GlobalState) => state.monitoring.isSubscribed;
