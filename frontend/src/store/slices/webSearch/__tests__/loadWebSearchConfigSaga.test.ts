import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import {
  LOAD_WEB_SEARCH_CONFIG_SUCCESS,
  LOAD_WEB_SEARCH_CONFIG_FAILURE,
  loadWebSearchConfigSuccess,
  loadWebSearchConfigFailure,
} from "../actions";
import { watchLoadWebSearchConfig } from "../saga/loadWebSearchConfigSaga";
import { LOAD_WEB_SEARCH_CONFIG } from "../actions";
import type { WebSearchConfig } from "../types";

const mockedRequest = graphqlClient.request as jest.Mock;

const buildConfig = (): WebSearchConfig => ({
  ddgEnabled: true,
  yandexEnabled: false,
  googleEnabled: true,
  cacheTtlHours: 24,
  rawSettingsYaml: "use_default_settings: true",
});

beforeEach(() => jest.clearAllMocks());

describe("loadWebSearchConfigSaga", () => {
  it("Success_DispatchesLoadSuccess", async () => {
    const config = buildConfig();
    mockedRequest.mockResolvedValueOnce({ webSearchConfig: config });

    await expectSaga(watchLoadWebSearchConfig)
      .put(loadWebSearchConfigSuccess(config))
      .dispatch({ type: LOAD_WEB_SEARCH_CONFIG })
      .silentRun(50);

    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("Success_StateHasCorrectConfig", async () => {
    const config = buildConfig();
    mockedRequest.mockResolvedValueOnce({ webSearchConfig: config });

    const result = await expectSaga(watchLoadWebSearchConfig)
      .dispatch({ type: LOAD_WEB_SEARCH_CONFIG })
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const successPut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === LOAD_WEB_SEARCH_CONFIG_SUCCESS
    );
    expect(successPut).toBeDefined();
  });

  it("NetworkError_DispatchesLoadFailure", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(watchLoadWebSearchConfig)
      .put(loadWebSearchConfigFailure())
      .dispatch({ type: LOAD_WEB_SEARCH_CONFIG })
      .silentRun(50);
  });

  it("NetworkError_DoesNotDispatchSuccess", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    const result = await expectSaga(watchLoadWebSearchConfig)
      .dispatch({ type: LOAD_WEB_SEARCH_CONFIG })
      .silentRun(50);

    const puts = result.effects.put ?? [];
    const successPut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === LOAD_WEB_SEARCH_CONFIG_SUCCESS
    );
    expect(successPut).toBeUndefined();

    const failurePut = puts.find(
      (p: { payload: { action: { type: string } } }) =>
        p.payload.action.type === LOAD_WEB_SEARCH_CONFIG_FAILURE
    );
    expect(failurePut).toBeDefined();
  });
});
