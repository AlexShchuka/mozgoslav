import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import {
  SAVE_WEB_SEARCH_CONFIG_SUCCESS,
  SAVE_WEB_SEARCH_CONFIG_FAILURE,
  saveWebSearchConfig,
  saveWebSearchConfigSuccess,
  saveWebSearchConfigFailure,
} from "../actions";
import { watchSaveWebSearchConfig } from "../saga/saveWebSearchConfigSaga";
import type { WebSearchConfig } from "../types";

const mockedRequest = graphqlClient.request as jest.Mock;

const buildConfig = (): WebSearchConfig => ({
  ddgEnabled: true,
  yandexEnabled: false,
  googleEnabled: false,
  cacheTtlHours: 12,
  rawSettingsYaml: "",
});

beforeEach(() => jest.clearAllMocks());

describe("saveWebSearchConfigSaga", () => {
  it("Success_DispatchesSaveSuccess_WithReturnedConfig", async () => {
    const config = buildConfig();
    mockedRequest.mockResolvedValueOnce({
      updateWebSearchConfig: { config, errors: [] },
    });

    await expectSaga(watchSaveWebSearchConfig)
      .put(saveWebSearchConfigSuccess(config))
      .dispatch(saveWebSearchConfig(config))
      .silentRun(50);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("UserError_NullConfig_DispatchesSaveFailure", async () => {
    mockedRequest.mockResolvedValueOnce({
      updateWebSearchConfig: {
        config: null,
        errors: [{ code: "VALIDATION", message: "bad yaml" }],
      },
    });

    await expectSaga(watchSaveWebSearchConfig)
      .put(saveWebSearchConfigFailure())
      .dispatch(saveWebSearchConfig(buildConfig()))
      .silentRun(50);
  });

  it("UserError_NullConfig_DoesNotDispatchSuccess", async () => {
    mockedRequest.mockResolvedValueOnce({
      updateWebSearchConfig: { config: null, errors: [] },
    });

    const result = await expectSaga(watchSaveWebSearchConfig)
      .dispatch(saveWebSearchConfig(buildConfig()))
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const successPut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === SAVE_WEB_SEARCH_CONFIG_SUCCESS
    );
    expect(successPut).toBeUndefined();
  });

  it("NetworkError_DispatchesSaveFailure", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("connection refused"));

    await expectSaga(watchSaveWebSearchConfig)
      .put(saveWebSearchConfigFailure())
      .dispatch(saveWebSearchConfig(buildConfig()))
      .silentRun(50);
  });

  it("NetworkError_DoesNotDispatchSuccess", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    const result = await expectSaga(watchSaveWebSearchConfig)
      .dispatch(saveWebSearchConfig(buildConfig()))
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const successPut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === SAVE_WEB_SEARCH_CONFIG_SUCCESS
    );
    expect(successPut).toBeUndefined();

    const failurePut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === SAVE_WEB_SEARCH_CONFIG_FAILURE
    );
    expect(failurePut).toBeDefined();
  });
});
