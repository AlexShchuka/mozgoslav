import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {throwError} from "redux-saga-test-plan/providers";

import {notifyError, notifySuccess} from "../../notifications";
import {bulkExport, bulkExportDone} from "../actions";
import {obsidianReducer} from "../reducer";
import {bulkExportSaga} from "../saga/bulkExportSaga";
import type {ObsidianBulkExportReport} from "../types";

jest.mock("../../../../api", () => {
    const obsidianStub = {
        applyLayout: jest.fn(),
        bulkExport: jest.fn(),
        setup: jest.fn(),
    };
    return {
        apiFactory: {createObsidianApi: () => obsidianStub},
        __obsidianStub: obsidianStub,
    };
});

const obsidianStub = (
    jest.requireMock("../../../../api") as {
        __obsidianStub: { applyLayout: jest.Mock; bulkExport: jest.Mock; setup: jest.Mock };
    }
).__obsidianStub;

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("bulkExportSaga", () => {
    beforeEach(() => jest.clearAllMocks());

    it("emits notifySuccess + BULK_EXPORT_DONE on happy path", async () => {
        const report: ObsidianBulkExportReport = {exportedCount: 42, skippedCount: 0};
        const result = await expectSaga(bulkExportSaga)
            .withReducer(obsidianReducer)
            .provide([[matchers.call.fn(obsidianStub.bulkExport), report]])
            .put(notifySuccess({
                messageKey: "obsidian.syncAllSuccess",
                params: {count: 42},
            }))
            .put(bulkExportDone())
            .run();

        expect(result.storeState.isBulkExporting).toBe(false);
    });

    it("emits notifyError + BULK_EXPORT_DONE on throw", async () => {
        const result = await expectSaga(bulkExportSaga)
            .withReducer(obsidianReducer)
            .provide([[matchers.call.fn(obsidianStub.bulkExport), throwError(new Error("oops"))]])
            .put(notifyError({
                messageKey: "errors.genericErrorWithMessage",
                params: {message: "oops"},
            }))
            .put(bulkExportDone())
            .run();

        expect(result.storeState.isBulkExporting).toBe(false);
    });

    it("reducer — BULK_EXPORT flips isBulkExporting true", () => {
        const state = obsidianReducer(undefined, dispatch(bulkExport()));
        expect(state.isBulkExporting).toBe(true);
    });

    it("reducer — BULK_EXPORT_DONE flips isBulkExporting false", () => {
        const progress = obsidianReducer(undefined, dispatch(bulkExport()));
        const done = obsidianReducer(progress, dispatch(bulkExportDone()));
        expect(done.isBulkExporting).toBe(false);
    });
});
