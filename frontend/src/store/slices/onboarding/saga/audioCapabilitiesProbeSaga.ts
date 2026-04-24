import { cancel, delay, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task } from "redux-saga";

import type { QueryDictationAudioCapabilitiesQuery } from "../../../../api/gql/graphql";
import { QueryDictationAudioCapabilitiesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  audioCapabilitiesUpdated,
  START_AUDIO_CAPABILITIES_PROBE,
  STOP_AUDIO_CAPABILITIES_PROBE,
} from "../actions";

function* pollLoop(): SagaIterator {
  while (true) {
    try {
      const data = (yield* gqlRequest(
        QueryDictationAudioCapabilitiesDocument,
        {}
      )) as QueryDictationAudioCapabilitiesQuery;
      yield put(
        audioCapabilitiesUpdated({
          capabilities: {
            isSupported: data.dictationAudioCapabilities.isSupported,
            detectedPlatform: data.dictationAudioCapabilities.detectedPlatform,
            permissionsRequired: data.dictationAudioCapabilities.permissionsRequired,
          },
        })
      );
    } catch {
      yield put(audioCapabilitiesUpdated({ capabilities: null }));
    }
    yield delay(2000);
  }
}

export function* audioCapabilitiesProbeSaga(): SagaIterator {
  const task: Task = (yield fork(pollLoop)) as Task;
  yield take(STOP_AUDIO_CAPABILITIES_PROBE);
  yield cancel(task);
}

export function* watchAudioCapabilitiesProbe(): SagaIterator {
  yield takeLatest(START_AUDIO_CAPABILITIES_PROBE, audioCapabilitiesProbeSaga);
}
