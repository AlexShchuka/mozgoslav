import { expectSaga } from "redux-saga-test-plan";

import { loadLlmModelsFailed, loadLlmModelsSucceeded } from "../actions";
import { loadLlmModelsSaga } from "../saga/loadLlmModelsSaga";
import { settingsReducer } from "../reducer";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

describe("loadLlmModelsSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("puts loadLlmModelsSucceeded with mapped descriptors on happy path", async () => {
    const descriptors = [
      {
        __typename: "LlmModelDescriptor" as const,
        id: "qwen2-7b",
        ownedBy: "org",
        contextLength: 8192,
        supportsToolCalling: true,
        supportsJsonMode: true,
      },
      {
        __typename: "LlmModelDescriptor" as const,
        id: "llama-3-8b",
        ownedBy: null,
        contextLength: null,
        supportsToolCalling: null,
        supportsJsonMode: null,
      },
    ];
    mockedRequest.mockResolvedValueOnce({ llmModels: descriptors });

    const result = await expectSaga(loadLlmModelsSaga)
      .withReducer(settingsReducer)
      .put(loadLlmModelsSucceeded(descriptors))
      .run();

    expect(result.storeState.llmModels.loading).toBe(false);
    expect(result.storeState.llmModels.available).toHaveLength(2);
    expect(result.storeState.llmModels.error).toBe(false);
  });

  it("puts loadLlmModelsFailed on throw", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network down"));

    const result = await expectSaga(loadLlmModelsSaga)
      .withReducer(settingsReducer)
      .put(loadLlmModelsFailed())
      .run();

    expect(result.storeState.llmModels.error).toBe(true);
    expect(result.storeState.llmModels.loading).toBe(false);
  });

  it("puts loadLlmModelsSucceeded with empty list when backend returns []", async () => {
    mockedRequest.mockResolvedValueOnce({ llmModels: [] });

    const result = await expectSaga(loadLlmModelsSaga)
      .withReducer(settingsReducer)
      .put(loadLlmModelsSucceeded([]))
      .run();

    expect(result.storeState.llmModels.available).toHaveLength(0);
    expect(result.storeState.llmModels.error).toBe(false);
  });
});
