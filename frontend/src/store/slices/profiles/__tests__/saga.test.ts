import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

import { CleanupLevel } from "../../../../api/gql/graphql";
import type { Profile } from "../../../../domain/Profile";
import {
  createProfile,
  createProfileSuccess,
  createProfileFailure,
  loadProfiles,
  loadProfilesSuccess,
  loadProfilesFailure,
  updateProfile,
  updateProfileSuccess,
  updateProfileFailure,
  deleteProfile,
  deleteProfileSuccess,
  deleteProfileFailure,
  duplicateProfile,
  duplicateProfileSuccess,
  duplicateProfileFailure,
} from "../actions";
import { profilesReducer } from "../reducer";
import {
  createProfileSaga,
  deleteProfileSaga,
  duplicateProfileSaga,
  loadProfilesSaga,
  updateProfileSaga,
} from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "p1",
  name: "Test Profile",
  systemPrompt: "",
  transcriptionPromptOverride: "",
  outputTemplate: "",
  cleanupLevel: "Light",
  exportFolder: "_inbox",
  autoTags: [],
  isDefault: false,
  isBuiltIn: false,
  glossaryByLanguage: {},
  llmCorrectionEnabled: false,
  llmProviderOverride: "",
  llmModelOverride: "",
  ...overrides,
});

const makeDraft = (
  overrides: Partial<Omit<Profile, "id" | "isBuiltIn">> = {}
): Omit<Profile, "id" | "isBuiltIn"> => ({
  name: "Fresh",
  systemPrompt: "",
  transcriptionPromptOverride: "",
  outputTemplate: "",
  cleanupLevel: "Light",
  exportFolder: "_inbox",
  autoTags: [],
  isDefault: false,
  glossaryByLanguage: {},
  llmCorrectionEnabled: false,
  llmProviderOverride: "",
  llmModelOverride: "",
  ...overrides,
});

const gqlProfile = {
  __typename: "Profile" as const,
  id: "p1",
  name: "Test Profile",
  systemPrompt: "",
  transcriptionPromptOverride: "",
  outputTemplate: "",
  cleanupLevel: CleanupLevel.Light,
  exportFolder: "_inbox",
  autoTags: [],
  isDefault: false,
  isBuiltIn: false,
  glossaryByLanguage: [],
  llmCorrectionEnabled: false,
  llmProviderOverride: "",
  llmModelOverride: "",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadProfilesSaga", () => {
  it("dispatches LOAD_PROFILES_SUCCESS with mapped profiles on success", async () => {
    mockedRequest.mockResolvedValueOnce({ profiles: [gqlProfile] });

    await expectSaga(loadProfilesSaga)
      .withReducer(profilesReducer)
      .dispatch(loadProfiles())
      .put(loadProfilesSuccess([makeProfile()]))
      .silentRun(50);
  });

  it("dispatches LOAD_PROFILES_FAILURE on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadProfilesSaga)
      .withReducer(profilesReducer)
      .put(loadProfilesFailure("network error"))
      .silentRun(50);
  });
});

describe("createProfileSaga", () => {
  it("dispatches CREATE_PROFILE_SUCCESS with mapped profile on success", async () => {
    const draft = makeDraft({ name: "Fresh" });
    mockedRequest.mockResolvedValueOnce({
      createProfile: { profile: { ...gqlProfile, name: "Fresh" }, errors: [] },
    });

    await expectSaga(createProfileSaga, createProfile(draft))
      .withReducer(profilesReducer)
      .put(createProfileSuccess(makeProfile({ name: "Fresh" })))
      .silentRun(50);
  });

  it("dispatches CREATE_PROFILE_FAILURE when API returns errors", async () => {
    const draft = makeDraft({ name: "" });
    mockedRequest.mockResolvedValueOnce({
      createProfile: { profile: null, errors: [{ message: "Name required" }] },
    });

    await expectSaga(createProfileSaga, createProfile(draft))
      .withReducer(profilesReducer)
      .put(createProfileFailure("Name required"))
      .silentRun(50);
  });

  it("dispatches CREATE_PROFILE_FAILURE on network error", async () => {
    const draft = makeDraft({ name: "X" });
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(createProfileSaga, createProfile(draft))
      .withReducer(profilesReducer)
      .put(createProfileFailure("timeout"))
      .silentRun(50);
  });
});

describe("updateProfileSaga", () => {
  it("dispatches UPDATE_PROFILE_SUCCESS with mapped profile on success", async () => {
    const draft = makeDraft({ name: "Renamed" });
    mockedRequest.mockResolvedValueOnce({
      updateProfile: { profile: { ...gqlProfile, name: "Renamed" }, errors: [] },
    });

    await expectSaga(updateProfileSaga, updateProfile("p1", draft))
      .withReducer(profilesReducer)
      .put(updateProfileSuccess(makeProfile({ name: "Renamed" })))
      .silentRun(50);
  });

  it("dispatches UPDATE_PROFILE_FAILURE on error", async () => {
    const draft = makeDraft({ name: "X" });
    mockedRequest.mockRejectedValueOnce(new Error("bad request"));

    await expectSaga(updateProfileSaga, updateProfile("p1", draft))
      .withReducer(profilesReducer)
      .put(updateProfileFailure("bad request"))
      .silentRun(50);
  });
});

describe("deleteProfileSaga", () => {
  it("dispatches DELETE_PROFILE_SUCCESS on success", async () => {
    mockedRequest.mockResolvedValueOnce({
      deleteProfile: { profile: null, errors: [] },
    });

    await expectSaga(deleteProfileSaga, deleteProfile("p1"))
      .withReducer(profilesReducer)
      .put(deleteProfileSuccess("p1"))
      .silentRun(50);
  });

  it("dispatches DELETE_PROFILE_FAILURE on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("forbidden"));

    await expectSaga(deleteProfileSaga, deleteProfile("p1"))
      .withReducer(profilesReducer)
      .put(deleteProfileFailure("p1", "forbidden"))
      .silentRun(50);
  });
});

describe("duplicateProfileSaga", () => {
  it("dispatches DUPLICATE_PROFILE_SUCCESS with mapped profile on success", async () => {
    mockedRequest.mockResolvedValueOnce({
      duplicateProfile: {
        profile: { ...gqlProfile, id: "p2", name: "Test Profile (copy)" },
        errors: [],
      },
    });

    await expectSaga(duplicateProfileSaga, duplicateProfile("p1"))
      .withReducer(profilesReducer)
      .put(duplicateProfileSuccess(makeProfile({ id: "p2", name: "Test Profile (copy)" })))
      .silentRun(50);
  });

  it("dispatches DUPLICATE_PROFILE_FAILURE on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("server error"));

    await expectSaga(duplicateProfileSaga, duplicateProfile("p1"))
      .withReducer(profilesReducer)
      .put(duplicateProfileFailure("p1", "server error"))
      .silentRun(50);
  });
});
