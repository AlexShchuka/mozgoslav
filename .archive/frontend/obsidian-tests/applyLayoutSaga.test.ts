import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import { notifyError, notifySuccess } from "../../notifications";
import { applyLayout, applyLayoutDone } from "../actions";
import { obsidianReducer } from "../reducer";
import { applyLayoutSaga } from "../saga/applyLayoutSaga";
import type { ObsidianApplyLayoutReport } from "../types";

jest.mock("../../../../api", () => {
  const obsidianStub = {
    applyLayout: jest.fn(),
    bulkExport: jest.fn(),
    setup: jest.fn(),
  };
  return {
    apiFactory: { createObsidianApi: () => obsidianStub },
    __obsidianStub: obsidianStub,
  };
});

const obsidianStub = (
  jest.requireMock("../../../../api") as {
    __obsidianStub: { applyLayout: jest.Mock; bulkExport: jest.Mock; setup: jest.Mock };
  }
).__obsidianStub;

const dispatch = (action: unknown) => action as Parameters<typeof obsidianReducer>[1];

describe("applyLayoutSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits notifySuccess + APPLY_LAYOUT_DONE on happy path", async () => {
    const report: ObsidianApplyLayoutReport = { createdFolders: 2, movedNotes: 5 };
    const result = await expectSaga(applyLayoutSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.applyLayout), report]])
      .put(
        notifySuccess({
          messageKey: "obsidian.applyLayoutSuccess",
          params: { folders: 2, notes: 5 },
        })
      )
      .put(applyLayoutDone())
      .run();

    expect(result.storeState.isApplyingLayout).toBe(false);
  });

  it("emits notifyError + APPLY_LAYOUT_DONE on throw", async () => {
    const result = await expectSaga(applyLayoutSaga)
      .withReducer(obsidianReducer)
      .provide([[matchers.call.fn(obsidianStub.applyLayout), throwError(new Error("bad"))]])
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "bad" },
        })
      )
      .put(applyLayoutDone())
      .run();

    expect(result.storeState.isApplyingLayout).toBe(false);
  });

  it("reducer — APPLY_LAYOUT flips isApplyingLayout true", () => {
    const state = obsidianReducer(undefined, dispatch(applyLayout()));
    expect(state.isApplyingLayout).toBe(true);
  });

  it("reducer — APPLY_LAYOUT_DONE flips isApplyingLayout false", () => {
    const progress = obsidianReducer(undefined, dispatch(applyLayout()));
    const done = obsidianReducer(progress, dispatch(applyLayoutDone()));
    expect(done.isApplyingLayout).toBe(false);
  });
});
