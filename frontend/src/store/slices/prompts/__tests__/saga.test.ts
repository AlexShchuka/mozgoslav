import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

import type { PromptTemplate } from "../../../../domain/prompts";
import {
  loadPrompts,
  loadPromptsSuccess,
  loadPromptsFailure,
  createPrompt,
  createPromptSuccess,
  createPromptFailure,
  updatePrompt,
  updatePromptSuccess,
  updatePromptFailure,
  deletePrompt,
  deletePromptSuccess,
  deletePromptFailure,
  previewPrompt,
  previewPromptSuccess,
  previewPromptFailure,
} from "../actions";
import { promptsReducer } from "../reducer";
import {
  loadPromptsSaga,
  createPromptSaga,
  updatePromptSaga,
  deletePromptSaga,
  previewPromptSaga,
} from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;

const makeTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
  id: "t1",
  name: "My Template",
  body: "Hello {{name}}",
  createdAt: "2026-04-28T10:00:00Z",
  ...overrides,
});

const gqlTemplate = {
  __typename: "PromptTemplateDto" as const,
  id: "t1",
  name: "My Template",
  body: "Hello {{name}}",
  createdAt: "2026-04-28T10:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadPromptsSaga", () => {
  it("dispatches LOAD_PROMPTS_SUCCESS with mapped templates on success", async () => {
    mockedRequest.mockResolvedValueOnce({ promptTemplates: [gqlTemplate] });

    await expectSaga(loadPromptsSaga)
      .withReducer(promptsReducer)
      .dispatch(loadPrompts())
      .put(loadPromptsSuccess([makeTemplate()]))
      .silentRun(50);
  });

  it("dispatches LOAD_PROMPTS_SUCCESS with empty list when result is null", async () => {
    mockedRequest.mockResolvedValueOnce({ promptTemplates: null });

    await expectSaga(loadPromptsSaga)
      .withReducer(promptsReducer)
      .put(loadPromptsSuccess([]))
      .silentRun(50);
  });

  it("dispatches LOAD_PROMPTS_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadPromptsSaga)
      .withReducer(promptsReducer)
      .put(loadPromptsFailure("network error"))
      .silentRun(50);
  });

  it("dispatches LOAD_PROMPTS_FAILURE with fallback on unknown error", async () => {
    mockedRequest.mockRejectedValueOnce("oops");

    await expectSaga(loadPromptsSaga)
      .withReducer(promptsReducer)
      .put(loadPromptsFailure("Unknown error"))
      .silentRun(50);
  });
});

describe("createPromptSaga", () => {
  it("dispatches CREATE_PROMPT_SUCCESS with mapped template on success", async () => {
    mockedRequest.mockResolvedValueOnce({ createPromptTemplate: gqlTemplate });

    await expectSaga(createPromptSaga, createPrompt("My Template", "Hello {{name}}"))
      .withReducer(promptsReducer)
      .put(createPromptSuccess(makeTemplate()))
      .silentRun(50);
  });

  it("dispatches CREATE_PROMPT_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("bad request"));

    await expectSaga(createPromptSaga, createPrompt("X", "Y"))
      .withReducer(promptsReducer)
      .put(createPromptFailure("bad request"))
      .silentRun(50);
  });
});

describe("updatePromptSaga", () => {
  it("dispatches UPDATE_PROMPT_SUCCESS with updated template on success", async () => {
    const updated = { ...gqlTemplate, name: "Renamed", body: "New body" };
    mockedRequest.mockResolvedValueOnce({ updatePromptTemplate: updated });

    await expectSaga(updatePromptSaga, updatePrompt("t1", "Renamed", "New body"))
      .withReducer(promptsReducer)
      .put(updatePromptSuccess(makeTemplate({ name: "Renamed", body: "New body" })))
      .silentRun(50);
  });

  it("dispatches UPDATE_PROMPT_FAILURE when template not found (null result)", async () => {
    mockedRequest.mockResolvedValueOnce({ updatePromptTemplate: null });

    await expectSaga(updatePromptSaga, updatePrompt("t1", "X", "Y"))
      .withReducer(promptsReducer)
      .put(updatePromptFailure("Template not found"))
      .silentRun(50);
  });

  it("dispatches UPDATE_PROMPT_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("server error"));

    await expectSaga(updatePromptSaga, updatePrompt("t1", "X", "Y"))
      .withReducer(promptsReducer)
      .put(updatePromptFailure("server error"))
      .silentRun(50);
  });
});

describe("deletePromptSaga", () => {
  it("dispatches DELETE_PROMPT_SUCCESS on success", async () => {
    mockedRequest.mockResolvedValueOnce({ deletePromptTemplate: true });

    await expectSaga(deletePromptSaga, deletePrompt("t1"))
      .withReducer(promptsReducer)
      .put(deletePromptSuccess("t1"))
      .silentRun(50);
  });

  it("dispatches DELETE_PROMPT_FAILURE when template not found (false result)", async () => {
    mockedRequest.mockResolvedValueOnce({ deletePromptTemplate: false });

    await expectSaga(deletePromptSaga, deletePrompt("t1"))
      .withReducer(promptsReducer)
      .put(deletePromptFailure("Template not found"))
      .silentRun(50);
  });

  it("dispatches DELETE_PROMPT_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("forbidden"));

    await expectSaga(deletePromptSaga, deletePrompt("t1"))
      .withReducer(promptsReducer)
      .put(deletePromptFailure("forbidden"))
      .silentRun(50);
  });
});

describe("previewPromptSaga", () => {
  it("dispatches PREVIEW_PROMPT_SUCCESS with resolved text on success", async () => {
    mockedRequest.mockResolvedValueOnce({ previewPrompt: "Resolved: Hello Alice" });

    await expectSaga(previewPromptSaga, previewPrompt("Hello {{name}}"))
      .withReducer(promptsReducer)
      .put(previewPromptSuccess("Resolved: Hello Alice"))
      .silentRun(50);
  });

  it("dispatches PREVIEW_PROMPT_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("preview failed"));

    await expectSaga(previewPromptSaga, previewPrompt("Hello {{name}}"))
      .withReducer(promptsReducer)
      .put(previewPromptFailure("preview failed"))
      .silentRun(50);
  });
});
