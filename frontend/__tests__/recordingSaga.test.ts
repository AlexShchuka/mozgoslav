import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {throwError} from "redux-saga-test-plan/providers";
import {loadRecordingsSaga} from "../src/store/slices/recording/saga";
import {
    loadRecordingsFailure,
    loadRecordingsSuccess,
    loadRecordingsUnavailable,
} from "../src/store/slices/recording/actions";
import apiFactory from "../src/api/ApiFactory";
import type {Recording} from "../src/domain";

const sampleRecording: Recording = {
    id: "r1",
    fileName: "a.m4a",
    filePath: "/tmp/a.m4a",
    sha256: "hash",
    duration: "60",
    format: "M4A",
    sourceType: "Imported",
    status: "Transcribed",
    createdAt: "2026-04-16T12:00:00Z",
};

describe("loadRecordingsSaga", () => {
    it("dispatches success with recordings from the API", () => {
        return expectSaga(loadRecordingsSaga)
            .provide([[matchers.call.fn(apiFactory.createRecordingApi().getAll), [sampleRecording]]])
            .put(loadRecordingsSuccess([sampleRecording]))
            .run();
    });

    it("dispatches backend-unavailable when the request errors without a response", () => {
        const networkError = Object.assign(new Error("Network Error"), {
            isAxiosError: true,
            response: undefined,
            toJSON: () => ({}),
        });

        return expectSaga(loadRecordingsSaga)
            .provide([
                [matchers.call.fn(apiFactory.createRecordingApi().getAll), throwError(networkError)],
            ])
            .put(loadRecordingsUnavailable())
            .run();
    });

    it("dispatches failure on generic errors", () => {
        return expectSaga(loadRecordingsSaga)
            .provide([
                [
                    matchers.call.fn(apiFactory.createRecordingApi().getAll),
                    throwError(new Error("boom")),
                ],
            ])
            .put(loadRecordingsFailure("boom"))
            .run();
    });
});
