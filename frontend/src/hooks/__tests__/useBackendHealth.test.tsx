import { renderHook, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, type Middleware } from "redux";
import createSagaMiddleware from "redux-saga";
import type { ReactNode } from "react";

import { rootReducer } from "../../store/rootReducer";
import { useBackendHealth } from "../useBackendHealth";
import { HEALTH_PROBE_REQUESTED } from "../../store/slices/health";

jest.useFakeTimers();

const makeStoreWithRecorder = () => {
  const recorded: Array<{ type: string }> = [];
  const sagaMiddleware = createSagaMiddleware();

  const recorderMiddleware: Middleware = () => (next) => (action) => {
    recorded.push(action as { type: string });
    return next(action);
  };

  const store = createStore(rootReducer, applyMiddleware(recorderMiddleware, sagaMiddleware));
  return { store, recorded };
};

const makeWrapper = (store: ReturnType<typeof createStore>) => {
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return TestWrapper;
};

describe("useBackendHealth", () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it("returns unknown status initially before any poll", () => {
    const { store } = makeStoreWithRecorder();
    const { result } = renderHook(() => useBackendHealth(5000), {
      wrapper: makeWrapper(store),
    });

    expect(result.current.status).toBe("unknown");
    expect(result.current.lastCheckedAt).toBeNull();
  });

  it("dispatches HEALTH_PROBE_REQUESTED after interval elapses", () => {
    const { store, recorded } = makeStoreWithRecorder();

    renderHook(() => useBackendHealth(1000), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    expect(recorded.some((a) => a.type === HEALTH_PROBE_REQUESTED)).toBe(true);
  });

  it("dispatches HEALTH_PROBE_REQUESTED multiple times on repeated intervals", () => {
    const { store, recorded } = makeStoreWithRecorder();

    renderHook(() => useBackendHealth(1000), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      jest.advanceTimersByTime(3500);
    });

    const probes = recorded.filter((a) => a.type === HEALTH_PROBE_REQUESTED);
    expect(probes.length).toBeGreaterThanOrEqual(3);
  });

  it("stops dispatching after unmount", () => {
    const { store, recorded } = makeStoreWithRecorder();

    const { unmount } = renderHook(() => useBackendHealth(1000), {
      wrapper: makeWrapper(store),
    });

    act(() => {
      jest.advanceTimersByTime(1001);
    });

    const countBefore = recorded.filter((a) => a.type === HEALTH_PROBE_REQUESTED).length;

    unmount();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const countAfter = recorded.filter((a) => a.type === HEALTH_PROBE_REQUESTED).length;

    expect(countAfter).toBe(countBefore);
  });
});
