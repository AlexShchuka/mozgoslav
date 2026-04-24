import type { AnyAction } from "redux";
import { dictationReducer } from "../reducer";
import { initialDictationState } from "../types";
import { dictationCancelFailed, dictationCancelRequested, dictationCancelled } from "../actions";
import type { DictationState } from "../types";
import type { DictationAction } from "../actions";

const reduce = (state: DictationState, action: DictationAction): DictationState =>
  dictationReducer(state, action as unknown as AnyAction);

const activeState: DictationState = {
  status: { phase: "active", sessionId: "s1", source: "dashboard", persistOnStop: true },
};

const stoppingState: DictationState = {
  status: { phase: "stopping", sessionId: "s2", persistOnStop: false },
};

describe("dictationReducer — cancel transitions", () => {
  it("active --CANCEL_REQUESTED--> cancelling", () => {
    const next = reduce(activeState, dictationCancelRequested());
    expect(next.status.phase).toBe("cancelling");
    if (next.status.phase === "cancelling") {
      expect(next.status.sessionId).toBe("s1");
      expect(next.status.persistOnStop).toBe(true);
    }
  });

  it("stopping --CANCEL_REQUESTED--> cancelling", () => {
    const next = reduce(stoppingState, dictationCancelRequested());
    expect(next.status.phase).toBe("cancelling");
    if (next.status.phase === "cancelling") {
      expect(next.status.sessionId).toBe("s2");
      expect(next.status.persistOnStop).toBe(false);
    }
  });

  it("idle --CANCEL_REQUESTED--> idle (no-op)", () => {
    const next = reduce(initialDictationState, dictationCancelRequested());
    expect(next).toBe(initialDictationState);
  });

  it("cancelling --CANCELLED--> idle", () => {
    const cancellingState: DictationState = {
      status: { phase: "cancelling", sessionId: "s1", persistOnStop: true },
    };
    const next = reduce(cancellingState, dictationCancelled());
    expect(next.status.phase).toBe("idle");
  });

  it("cancelling --CANCEL_FAILED--> idle", () => {
    const cancellingState: DictationState = {
      status: { phase: "cancelling", sessionId: "s1", persistOnStop: true },
    };
    const next = reduce(cancellingState, dictationCancelFailed({ error: "oops" }));
    expect(next.status.phase).toBe("idle");
  });
});
