import type { Reducer } from "redux";
import {
  LOAD_ROUTINES,
  LOAD_ROUTINES_FAILURE,
  LOAD_ROUTINES_SUCCESS,
  RUN_ROUTINE_NOW,
  RUN_ROUTINE_NOW_FAILURE,
  RUN_ROUTINE_NOW_SUCCESS,
  TOGGLE_ROUTINE,
  TOGGLE_ROUTINE_FAILURE,
  TOGGLE_ROUTINE_SUCCESS,
  type RoutinesAction,
} from "./actions";
import { initialRoutinesState, type RoutinesState } from "./types";
import type { RoutineDefinition, RoutineRun } from "../../../domain/routines";

export const routinesReducer: Reducer<RoutinesState> = (
  state: RoutinesState = initialRoutinesState,
  action
): RoutinesState => {
  const typed = action as RoutinesAction;
  switch (typed.type) {
    case LOAD_ROUTINES:
      return { ...state, isLoading: true, error: null };
    case LOAD_ROUTINES_SUCCESS:
      return {
        ...state,
        isLoading: false,
        routines: (typed as { payload: RoutineDefinition[] }).payload,
        error: null,
      };
    case LOAD_ROUTINES_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: (typed as { payload: string }).payload,
      };
    case TOGGLE_ROUTINE: {
      const { key } = (typed as { payload: { key: string; enabled: boolean } }).payload;
      return { ...state, togglingKeys: { ...state.togglingKeys, [key]: true } };
    }
    case TOGGLE_ROUTINE_SUCCESS: {
      const updated = (typed as { payload: RoutineDefinition }).payload;
      const { [updated.key]: _removed, ...restTogglingKeys } = state.togglingKeys;
      return {
        ...state,
        togglingKeys: restTogglingKeys,
        routines: state.routines.map((r) => (r.key === updated.key ? updated : r)),
      };
    }
    case TOGGLE_ROUTINE_FAILURE: {
      return {
        ...state,
        togglingKeys: {},
        error: (typed as { payload: string }).payload,
      };
    }
    case RUN_ROUTINE_NOW: {
      const { key } = (typed as { payload: { key: string } }).payload;
      return { ...state, runningKeys: { ...state.runningKeys, [key]: true } };
    }
    case RUN_ROUTINE_NOW_SUCCESS: {
      const run = (typed as { payload: RoutineRun }).payload;
      const { [run.routineKey]: _removed, ...restRunningKeys } = state.runningKeys;
      return {
        ...state,
        runningKeys: restRunningKeys,
        routines: state.routines.map((r) =>
          r.key === run.routineKey ? { ...r, lastRun: run } : r
        ),
      };
    }
    case RUN_ROUTINE_NOW_FAILURE: {
      return {
        ...state,
        runningKeys: {},
        error: (typed as { payload: string }).payload,
      };
    }
    default:
      return state;
  }
};
