import { put, takeEvery, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type {
  MutationRunRoutineNowMutation,
  MutationToggleRoutineMutation,
  QueryRoutinesQuery,
} from "../../../api/gql/graphql";
import {
  MutationRunRoutineNowDocument,
  MutationToggleRoutineDocument,
  QueryRoutinesDocument,
} from "../../../api/gql/graphql";
import { gqlRequest } from "../../saga/graphql";
import {
  LOAD_ROUTINES,
  RUN_ROUTINE_NOW,
  TOGGLE_ROUTINE,
  loadRoutinesFailure,
  loadRoutinesSuccess,
  runRoutineNowFailure,
  runRoutineNowSuccess,
  toggleRoutineFailure,
  toggleRoutineSuccess,
  type RunRoutineNowAction,
  type ToggleRoutineAction,
} from "./actions";

export function* loadRoutinesSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryRoutinesDocument, {})) as QueryRoutinesQuery;
    const routines = (result.routines ?? []).map((r) => ({
      key: r.key,
      displayName: r.displayName,
      description: r.description,
      isEnabled: r.isEnabled,
      lastRun: r.lastRun
        ? {
            id: r.lastRun.id as string,
            routineKey: r.lastRun.routineKey,
            startedAt: r.lastRun.startedAt as string,
            finishedAt: (r.lastRun.finishedAt as string | null) ?? null,
            status: r.lastRun.status,
            errorMessage: r.lastRun.errorMessage ?? null,
            payloadSummary: r.lastRun.payloadSummary ?? null,
          }
        : null,
    }));
    yield put(loadRoutinesSuccess(routines));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadRoutinesFailure(message));
  }
}

export function* toggleRoutineSaga(action: ToggleRoutineAction): SagaIterator {
  const { key, enabled } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationToggleRoutineDocument, {
      key,
      enabled,
    })) as MutationToggleRoutineMutation;
    const r = result.toggleRoutine;
    yield put(
      toggleRoutineSuccess({
        key: r.key,
        displayName: r.displayName,
        description: r.description,
        isEnabled: r.isEnabled,
        lastRun: r.lastRun
          ? {
              id: r.lastRun.id as string,
              routineKey: r.lastRun.routineKey,
              startedAt: r.lastRun.startedAt as string,
              finishedAt: (r.lastRun.finishedAt as string | null) ?? null,
              status: r.lastRun.status,
              errorMessage: r.lastRun.errorMessage ?? null,
              payloadSummary: r.lastRun.payloadSummary ?? null,
            }
          : null,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(toggleRoutineFailure(message));
  }
}

export function* runRoutineNowSaga(action: RunRoutineNowAction): SagaIterator {
  const { key } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationRunRoutineNowDocument, {
      key,
    })) as MutationRunRoutineNowMutation;
    const r = result.runRoutineNow;
    yield put(
      runRoutineNowSuccess({
        id: r.id as string,
        routineKey: r.routineKey,
        startedAt: r.startedAt as string,
        finishedAt: (r.finishedAt as string | null) ?? null,
        status: r.status,
        errorMessage: r.errorMessage ?? null,
        payloadSummary: r.payloadSummary ?? null,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(runRoutineNowFailure(message));
  }
}

export function* watchRoutinesSagas(): SagaIterator {
  yield takeLatest(LOAD_ROUTINES, loadRoutinesSaga);
  yield takeEvery(TOGGLE_ROUTINE, toggleRoutineSaga);
  yield takeEvery(RUN_ROUTINE_NOW, runRoutineNowSaga);
}
