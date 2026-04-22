import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {throwError} from "redux-saga-test-plan/providers";

import {notifyError, notifySuccess} from "../../notifications";
import {setupObsidian, setupObsidianDone} from "../actions";
import {obsidianReducer} from "../reducer";
import {setupObsidianSaga} from "../saga/setupObsidianSaga";
import type {ObsidianSetupReport} from "../types";

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

describe("setupObsidianSaga", () => {
    beforeEach(() => jest.clearAllMocks());

    it("emits notifySuccess + SETUP_OBSIDIAN_DONE on happy path", async () => {
        const report: ObsidianSetupReport = {createdPaths: ["/a", "/b", "/c"]};
        const result = await expectSaga(setupObsidianSaga, setupObsidian("/tmp/vault"))
            .withReducer(obsidianReducer)
            .provide([[matchers.call.fn(obsidianStub.setup), report]])
            .put(notifySuccess({
                messageKey: "obsidian.setupSuccess",
                params: {created: 3},
            }))
            .put(setupObsidianDone())
            .run();

        expect(result.storeState.isSetupInProgress).toBe(false);
        expect(result.storeState.error).toBeNull();
    });

    it("emits notifyError + SETUP_OBSIDIAN_DONE on throw", async () => {
        const result = await expectSaga(setupObsidianSaga, setupObsidian("/tmp/vault"))
            .withReducer(obsidianReducer)
            .provide([[matchers.call.fn(obsidianStub.setup), throwError(new Error("nope"))]])
            .put(notifyError({
                messageKey: "errors.genericErrorWithMessage",
                params: {message: "nope"},
            }))
            .put(setupObsidianDone())
            .run();

        expect(result.storeState.isSetupInProgress).toBe(false);
        expect(result.storeState.error).toBeNull();
    });

    it("reducer — SETUP_OBSIDIAN flips isSetupInProgress true", () => {
        const state = obsidianReducer(undefined, dispatch(setupObsidian("/v")));
        expect(state.isSetupInProgress).toBe(true);
    });

    it("reducer — SETUP_OBSIDIAN_DONE flips isSetupInProgress false", () => {
        const progress = obsidianReducer(undefined, dispatch(setupObsidian("/v")));
        const done = obsidianReducer(progress, dispatch(setupObsidianDone()));
        expect(done.isSetupInProgress).toBe(false);
    });
});
