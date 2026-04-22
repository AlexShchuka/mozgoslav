import {expectSaga} from "redux-saga-test-plan";

import {
    notifyError,
    notifyInfo,
    notifySuccess,
    notifyWarning,
} from "../actions";
import {watchNotificationsSagas} from "../saga";

jest.mock("react-toastify", () => ({
    toast: {
        success: jest.fn(),
        error: jest.fn(),
        warning: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock("../../../../i18n", () => ({
    __esModule: true,
    default: {
        t: jest.fn(
            (key: string, params?: Record<string, unknown>) =>
                `${key}::${JSON.stringify(params ?? {})}`,
        ),
    },
}));

const {toast} = jest.requireMock("react-toastify") as {
    toast: {
        success: jest.Mock;
        error: jest.Mock;
        warning: jest.Mock;
        info: jest.Mock;
    };
};

describe("notifications saga", () => {
    beforeEach(() => jest.clearAllMocks());

    it("calls toast.success with translated message on NOTIFY_SUCCESS", async () => {
        await expectSaga(watchNotificationsSagas)
            .dispatch(notifySuccess({messageKey: "hello.world", params: {a: 1}}))
            .silentRun(20);

        expect(toast.success).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith(`hello.world::${JSON.stringify({a: 1})}`);
        expect(toast.error).not.toHaveBeenCalled();
        expect(toast.warning).not.toHaveBeenCalled();
        expect(toast.info).not.toHaveBeenCalled();
    });

    it("calls toast.error on NOTIFY_ERROR", async () => {
        await expectSaga(watchNotificationsSagas)
            .dispatch(notifyError({messageKey: "boom"}))
            .silentRun(20);

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith(`boom::${JSON.stringify({})}`);
    });

    it("calls toast.warning on NOTIFY_WARNING", async () => {
        await expectSaga(watchNotificationsSagas)
            .dispatch(notifyWarning({messageKey: "careful"}))
            .silentRun(20);

        expect(toast.warning).toHaveBeenCalledTimes(1);
        expect(toast.warning).toHaveBeenCalledWith(`careful::${JSON.stringify({})}`);
    });

    it("calls toast.info on NOTIFY_INFO", async () => {
        await expectSaga(watchNotificationsSagas)
            .dispatch(notifyInfo({messageKey: "heads-up"}))
            .silentRun(20);

        expect(toast.info).toHaveBeenCalledTimes(1);
        expect(toast.info).toHaveBeenCalledWith(`heads-up::${JSON.stringify({})}`);
    });
});
