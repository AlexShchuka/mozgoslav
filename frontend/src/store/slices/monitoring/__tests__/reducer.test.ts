import {
  monitoringLoadFailed,
  monitoringLoadRequested,
  monitoringLoadSucceeded,
  monitoringReprobeFailed,
  monitoringReprobeRequested,
  monitoringReprobeSucceeded,
  monitoringStateUpdated,
  monitoringSubscribe,
  monitoringUnsubscribe,
  type MonitoringAction,
} from "../actions";
import { monitoringReducer } from "../reducer";
import { initialMonitoringState } from "../types";
import type { RuntimeState } from "../../../../api/gql/graphql";

const dispatch = (action: MonitoringAction): Parameters<typeof monitoringReducer>[1] =>
  action as Parameters<typeof monitoringReducer>[1];

const makeRuntimeState = (): RuntimeState =>
  ({
    llm: {
      endpoint: "http://localhost:1234",
      online: true,
      lastProbedAt: "2024-01-01T00:00:00Z",
      model: "test-model",
      contextLength: 4096,
      supportsToolCalling: true,
      supportsJsonMode: false,
      lastError: null,
    },
    syncthing: {
      detection: "running",
      binaryPath: null,
      apiUrl: null,
      version: null,
      hint: null,
    },
    services: [],
  }) as unknown as RuntimeState;

describe("monitoring reducer", () => {
  it("returns initial state", () => {
    const state = monitoringReducer(undefined, dispatch(monitoringLoadRequested()));
    expect(state.runtimeState).toBeNull();
    expect(state.error).toBeNull();
  });

  it("MONITORING_LOAD_REQUESTED sets isLoading=true and clears error", () => {
    const withError = { ...initialMonitoringState, error: "prev-error" };
    const next = monitoringReducer(withError, dispatch(monitoringLoadRequested()));
    expect(next.isLoading).toBe(true);
    expect(next.error).toBeNull();
  });

  it("MONITORING_LOAD_SUCCEEDED populates runtimeState and clears isLoading", () => {
    const loading = { ...initialMonitoringState, isLoading: true };
    const state = makeRuntimeState();
    const next = monitoringReducer(loading, dispatch(monitoringLoadSucceeded(state)));
    expect(next.isLoading).toBe(false);
    expect(next.runtimeState).toEqual(state);
    expect(next.error).toBeNull();
  });

  it("MONITORING_LOAD_FAILED sets error and clears isLoading, retains previous runtimeState", () => {
    const prevState = makeRuntimeState();
    const loaded = { ...initialMonitoringState, runtimeState: prevState };
    const next = monitoringReducer(loaded, dispatch(monitoringLoadFailed("something broke")));
    expect(next.isLoading).toBe(false);
    expect(next.error).toBe("something broke");
    expect(next.runtimeState).toEqual(prevState);
  });

  it("MONITORING_STATE_UPDATED replaces runtimeState atomically", () => {
    const initial = makeRuntimeState();
    const loaded = { ...initialMonitoringState, runtimeState: initial };
    const updated = {
      ...makeRuntimeState(),
      services: [
        { name: "svc", state: "running", lastError: null, restartCount: 0, pid: null, port: null },
      ],
    };
    const next = monitoringReducer(
      loaded,
      dispatch(monitoringStateUpdated(updated as unknown as RuntimeState))
    );
    expect(next.runtimeState).toEqual(updated);
  });

  it("MONITORING_SUBSCRIBE sets isSubscribed=true", () => {
    const next = monitoringReducer(initialMonitoringState, dispatch(monitoringSubscribe()));
    expect(next.isSubscribed).toBe(true);
  });

  it("MONITORING_UNSUBSCRIBE sets isSubscribed=false", () => {
    const subscribed = { ...initialMonitoringState, isSubscribed: true };
    const next = monitoringReducer(subscribed, dispatch(monitoringUnsubscribe()));
    expect(next.isSubscribed).toBe(false);
  });

  it("MONITORING_REPROBE_REQUESTED sets isReprobing=true", () => {
    const next = monitoringReducer(initialMonitoringState, dispatch(monitoringReprobeRequested()));
    expect(next.isReprobing).toBe(true);
  });

  it("MONITORING_REPROBE_SUCCEEDED sets isReprobing=false", () => {
    const reprobing = { ...initialMonitoringState, isReprobing: true };
    const next = monitoringReducer(reprobing, dispatch(monitoringReprobeSucceeded()));
    expect(next.isReprobing).toBe(false);
  });

  it("MONITORING_REPROBE_FAILED sets isReprobing=false and stores error", () => {
    const reprobing = { ...initialMonitoringState, isReprobing: true };
    const next = monitoringReducer(reprobing, dispatch(monitoringReprobeFailed("reprobe failed")));
    expect(next.isReprobing).toBe(false);
    expect(next.error).toBe("reprobe failed");
  });
});
