import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import { loadSettingsFailure, loadSettingsSuccess } from "../actions";
import { loadSettingsSaga } from "../saga/loadSettingsSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api", () => {
  const settingsStub = { getSettings: jest.fn(), saveSettings: jest.fn() };
  return {
    apiFactory: { createSettingsApi: () => settingsStub },
    __settingsStub: settingsStub,
  };
});

const settingsStub = (
  jest.requireMock("../../../../api") as {
    __settingsStub: { getSettings: jest.Mock; saveSettings: jest.Mock };
  }
).__settingsStub;

const fakeSettings = { language: "ru", themeMode: "system" } as unknown as AppSettings;

describe("loadSettingsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts loadSettingsSuccess on happy path", async () => {
    await expectSaga(loadSettingsSaga)
      .withReducer(settingsReducer)
      .provide([[matchers.call.fn(settingsStub.getSettings), fakeSettings]])
      .put(loadSettingsSuccess(fakeSettings))
      .run();
  });

  it("puts notifyError + loadSettingsFailure on throw", async () => {
    const result = await expectSaga(loadSettingsSaga)
      .withReducer(settingsReducer)
      .provide([[matchers.call.fn(settingsStub.getSettings), throwError(new Error("no net"))]])
      .put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: "no net" },
        })
      )
      .put(loadSettingsFailure())
      .run();

    expect(result.storeState.isLoading).toBe(false);
  });
});
