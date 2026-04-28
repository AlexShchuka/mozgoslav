import type { RoutineDefinition, RoutineRun } from "../../../domain/routines";

export const LOAD_ROUTINES = "routines/LOAD";
export const LOAD_ROUTINES_SUCCESS = "routines/LOAD_SUCCESS";
export const LOAD_ROUTINES_FAILURE = "routines/LOAD_FAILURE";

export const TOGGLE_ROUTINE = "routines/TOGGLE";
export const TOGGLE_ROUTINE_SUCCESS = "routines/TOGGLE_SUCCESS";
export const TOGGLE_ROUTINE_FAILURE = "routines/TOGGLE_FAILURE";

export const RUN_ROUTINE_NOW = "routines/RUN_NOW";
export const RUN_ROUTINE_NOW_SUCCESS = "routines/RUN_NOW_SUCCESS";
export const RUN_ROUTINE_NOW_FAILURE = "routines/RUN_NOW_FAILURE";

export interface LoadRoutinesAction {
  type: typeof LOAD_ROUTINES;
}

export interface LoadRoutinesSuccessAction {
  type: typeof LOAD_ROUTINES_SUCCESS;
  payload: RoutineDefinition[];
}

export interface LoadRoutinesFailureAction {
  type: typeof LOAD_ROUTINES_FAILURE;
  payload: string;
}

export interface ToggleRoutineAction {
  type: typeof TOGGLE_ROUTINE;
  payload: { key: string; enabled: boolean };
}

export interface ToggleRoutineSuccessAction {
  type: typeof TOGGLE_ROUTINE_SUCCESS;
  payload: RoutineDefinition;
}

export interface ToggleRoutineFailureAction {
  type: typeof TOGGLE_ROUTINE_FAILURE;
  payload: string;
}

export interface RunRoutineNowAction {
  type: typeof RUN_ROUTINE_NOW;
  payload: { key: string };
}

export interface RunRoutineNowSuccessAction {
  type: typeof RUN_ROUTINE_NOW_SUCCESS;
  payload: RoutineRun;
}

export interface RunRoutineNowFailureAction {
  type: typeof RUN_ROUTINE_NOW_FAILURE;
  payload: string;
}

export type RoutinesAction =
  | LoadRoutinesAction
  | LoadRoutinesSuccessAction
  | LoadRoutinesFailureAction
  | ToggleRoutineAction
  | ToggleRoutineSuccessAction
  | ToggleRoutineFailureAction
  | RunRoutineNowAction
  | RunRoutineNowSuccessAction
  | RunRoutineNowFailureAction;

export const loadRoutines = (): LoadRoutinesAction => ({
  type: LOAD_ROUTINES,
});

export const loadRoutinesSuccess = (routines: RoutineDefinition[]): LoadRoutinesSuccessAction => ({
  type: LOAD_ROUTINES_SUCCESS,
  payload: routines,
});

export const loadRoutinesFailure = (message: string): LoadRoutinesFailureAction => ({
  type: LOAD_ROUTINES_FAILURE,
  payload: message,
});

export const toggleRoutine = (key: string, enabled: boolean): ToggleRoutineAction => ({
  type: TOGGLE_ROUTINE,
  payload: { key, enabled },
});

export const toggleRoutineSuccess = (routine: RoutineDefinition): ToggleRoutineSuccessAction => ({
  type: TOGGLE_ROUTINE_SUCCESS,
  payload: routine,
});

export const toggleRoutineFailure = (message: string): ToggleRoutineFailureAction => ({
  type: TOGGLE_ROUTINE_FAILURE,
  payload: message,
});

export const runRoutineNow = (key: string): RunRoutineNowAction => ({
  type: RUN_ROUTINE_NOW,
  payload: { key },
});

export const runRoutineNowSuccess = (run: RoutineRun): RunRoutineNowSuccessAction => ({
  type: RUN_ROUTINE_NOW_SUCCESS,
  payload: run,
});

export const runRoutineNowFailure = (message: string): RunRoutineNowFailureAction => ({
  type: RUN_ROUTINE_NOW_FAILURE,
  payload: message,
});
