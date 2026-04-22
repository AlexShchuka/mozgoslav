import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {throwError} from "redux-saga-test-plan/providers";

import type {AppSettings} from "../../../../domain/Settings";
import {notifyError} from "../../notifications";
import {saveSettings, saveSettingsFailure, saveSettingsSuccess} from "../actions";
import {saveSettingsSaga} from "../saga/saveSettingsSaga";
import {settingsReducer} from "../reducer";

jest.mock("../../../../api", () => {
    const settingsStub = {getSettings: jest.fn(), saveSettings: jest.fn()};
    return {
        apiFactory: {createSettingsApi: () => settingsStub},
        __settingsStub: settingsStub,
    };
});

const settingsStub = (
    jest.requireMock("../../../../api") as {
        __settingsStub: { getSettings: jest.Mock; saveSettings: jest.Mock };
    }
).__settingsStub;

const fakeSettings = {language: "ru", themeMode: "light"} as unknown as AppSettings;

describe("saveSettingsSaga", () => {
    beforeEach(() => jest.clearAllMocks());

    it("puts saveSettingsSuccess on happy path", async () => {
        await expectSaga(saveSettingsSaga, saveSettings(fakeSettings))
            .withReducer(settingsReducer)
            .provide([[matchers.call.fn(settingsStub.saveSettings), fakeSettings]])
            .put(saveSettingsSuccess(fakeSettings))
            .run();
    });

    it("puts notifyError + saveSettingsFailure on throw", async () => {
        const result = await expectSaga(saveSettingsSaga, saveSettings(fakeSettings))
            .withReducer(settingsReducer)
            .provide([
                [matchers.call.fn(settingsStub.saveSettings), throwError(new Error("bad"))],
            ])
            .put(notifyError({
                messageKey: "errors.genericErrorWithMessage",
                params: {message: "bad"},
            }))
            .put(saveSettingsFailure())
            .run();

        expect(result.storeState.isSaving).toBe(false);
    });
});
