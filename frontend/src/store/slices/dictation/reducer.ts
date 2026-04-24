import type { Reducer } from "redux";
import {
  DICTATION_CANCEL_FAILED,
  DICTATION_CANCEL_REQUESTED,
  DICTATION_CANCELLED,
  DICTATION_FAILED,
  DICTATION_RESET,
  DICTATION_START_REQUESTED,
  DICTATION_STARTED,
  DICTATION_STOP_REQUESTED,
  DICTATION_STOPPED,
  type DictationAction,
} from "./actions";
import { initialDictationState, type DictationState } from "./types";

export const dictationReducer: Reducer<DictationState> = (
  state: DictationState = initialDictationState,
  action
): DictationState => {
  const typed = action as DictationAction;
  switch (typed.type) {
    case DICTATION_START_REQUESTED: {
      if (state.status.phase !== "idle") return state;
      return {
        status: {
          phase: "starting",
          source: typed.payload.source,
          persistOnStop: typed.payload.persistOnStop,
        },
      };
    }
    case DICTATION_STARTED: {
      if (state.status.phase !== "starting") return state;
      return {
        status: {
          phase: "active",
          sessionId: typed.payload.sessionId,
          source: state.status.source,
          persistOnStop: state.status.persistOnStop,
        },
      };
    }
    case DICTATION_STOP_REQUESTED: {
      if (state.status.phase !== "active") return state;
      return {
        status: {
          phase: "stopping",
          sessionId: state.status.sessionId,
          persistOnStop: state.status.persistOnStop,
        },
      };
    }
    case DICTATION_STOPPED: {
      if (state.status.phase !== "stopping") return state;
      return {
        status: {
          phase: "stopped",
          polishedText: typed.payload.polishedText,
          persistOnStop: state.status.persistOnStop,
        },
      };
    }
    case DICTATION_FAILED: {
      const phase = state.status.phase;
      if (phase !== "starting" && phase !== "active" && phase !== "stopping") return state;
      return {
        status: {
          phase: "failed",
          error: typed.payload.error,
        },
      };
    }
    case DICTATION_RESET: {
      const phase = state.status.phase;
      if (phase !== "stopped" && phase !== "failed") return state;
      return initialDictationState;
    }
    case DICTATION_CANCEL_REQUESTED: {
      const phase = state.status.phase;
      if (phase !== "active" && phase !== "stopping") return state;
      const { sessionId, persistOnStop } = state.status as {
        sessionId: string;
        persistOnStop: boolean;
      };
      return { status: { phase: "cancelling", sessionId, persistOnStop } };
    }
    case DICTATION_CANCELLED:
      return initialDictationState;
    case DICTATION_CANCEL_FAILED:
      return initialDictationState;
    default:
      return state;
  }
};
