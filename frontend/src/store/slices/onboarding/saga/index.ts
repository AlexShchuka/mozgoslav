import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchPersistCompletion } from "./persistCompletionSaga";
import { watchLlmHealthProbe } from "./llmHealthProbeSaga";
import { watchObsidianDetectProbe } from "./obsidianDetectProbeSaga";
import { watchAudioCapabilitiesProbe } from "./audioCapabilitiesProbeSaga";

export { persistCompletionSaga } from "./persistCompletionSaga";

export function* watchOnboardingSagas(): SagaIterator {
  yield all([
    fork(watchPersistCompletion),
    fork(watchLlmHealthProbe),
    fork(watchObsidianDetectProbe),
    fork(watchAudioCapabilitiesProbe),
  ]);
}
