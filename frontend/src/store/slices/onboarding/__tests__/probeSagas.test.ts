import { expectSaga } from "redux-saga-test-plan";

import { llmHealthProbeSaga } from "../saga/llmHealthProbeSaga";
import { obsidianDetectProbeSaga } from "../saga/obsidianDetectProbeSaga";
import { audioCapabilitiesProbeSaga } from "../saga/audioCapabilitiesProbeSaga";
import {
  audioCapabilitiesUpdated,
  llmHealthUpdated,
  obsidianDetectionUpdated,
  stopAudioCapabilitiesProbe,
  stopLlmHealthProbe,
  stopObsidianDetectProbe,
  type OnboardingAction,
} from "../actions";
import { onboardingReducer } from "../reducer";
import { initialOnboardingState } from "../types";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

const asAction = (a: OnboardingAction): Parameters<typeof onboardingReducer>[1] =>
  a as Parameters<typeof onboardingReducer>[1];

describe("llmHealthProbeSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dispatches llmHealthUpdated(reachable:true) on success then stops", async () => {
    mockedRequest.mockResolvedValue({ llmHealth: { available: true } });

    await expectSaga(llmHealthProbeSaga)
      .withReducer(onboardingReducer)
      .put(llmHealthUpdated({ reachable: true }))
      .dispatch(stopLlmHealthProbe())
      .silentRun();
  });

  it("dispatches llmHealthUpdated(reachable:false) on API error", async () => {
    mockedRequest.mockRejectedValue(new Error("down"));

    await expectSaga(llmHealthProbeSaga)
      .withReducer(onboardingReducer)
      .put(llmHealthUpdated({ reachable: false }))
      .dispatch(stopLlmHealthProbe())
      .silentRun();
  });
});

describe("obsidianDetectProbeSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dispatches obsidianDetectionUpdated on success then stops", async () => {
    const detected = [{ path: "/vault", name: "MyVault" }];
    mockedRequest.mockResolvedValue({ obsidianDetect: { searched: [], detected } });

    await expectSaga(obsidianDetectProbeSaga)
      .withReducer(onboardingReducer)
      .put(obsidianDetectionUpdated({ detected }))
      .dispatch(stopObsidianDetectProbe())
      .silentRun();
  });

  it("dispatches obsidianDetectionUpdated with empty array on API error", async () => {
    mockedRequest.mockRejectedValue(new Error("down"));

    await expectSaga(obsidianDetectProbeSaga)
      .withReducer(onboardingReducer)
      .put(obsidianDetectionUpdated({ detected: [] }))
      .dispatch(stopObsidianDetectProbe())
      .silentRun();
  });
});

describe("audioCapabilitiesProbeSaga", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dispatches audioCapabilitiesUpdated on success then stops", async () => {
    mockedRequest.mockResolvedValue({
      dictationAudioCapabilities: {
        isSupported: true,
        detectedPlatform: "macos",
        permissionsRequired: ["mic"],
      },
    });

    await expectSaga(audioCapabilitiesProbeSaga)
      .withReducer(onboardingReducer)
      .put(
        audioCapabilitiesUpdated({
          capabilities: {
            isSupported: true,
            detectedPlatform: "macos",
            permissionsRequired: ["mic"],
          },
        })
      )
      .dispatch(stopAudioCapabilitiesProbe())
      .silentRun();
  });

  it("dispatches audioCapabilitiesUpdated(null) on API error", async () => {
    mockedRequest.mockRejectedValue(new Error("down"));

    await expectSaga(audioCapabilitiesProbeSaga)
      .withReducer(onboardingReducer)
      .put(audioCapabilitiesUpdated({ capabilities: null }))
      .dispatch(stopAudioCapabilitiesProbe())
      .silentRun();
  });
});

describe("onboarding reducer — probe updates", () => {
  it("LLM_HEALTH_UPDATED sets reachable and loaded", () => {
    const state = onboardingReducer(
      initialOnboardingState,
      asAction(llmHealthUpdated({ reachable: true }))
    );
    expect(state.llmHealth).toEqual({ reachable: true, loaded: true });
  });

  it("OBSIDIAN_DETECTION_UPDATED sets detected and loaded", () => {
    const detected = [{ path: "/v", name: "V" }];
    const state = onboardingReducer(
      initialOnboardingState,
      asAction(obsidianDetectionUpdated({ detected }))
    );
    expect(state.obsidianDetection).toEqual({ detected, loaded: true });
  });

  it("AUDIO_CAPABILITIES_UPDATED sets capabilities and loaded", () => {
    const caps = {
      isSupported: true,
      detectedPlatform: "macos",
      permissionsRequired: [] as string[],
    };
    const state = onboardingReducer(
      initialOnboardingState,
      asAction(audioCapabilitiesUpdated({ capabilities: caps }))
    );
    expect(state.audioCapabilities).toEqual({ capabilities: caps, loaded: true });
  });

  it("AUDIO_CAPABILITIES_UPDATED with null sets loaded", () => {
    const state = onboardingReducer(
      initialOnboardingState,
      asAction(audioCapabilitiesUpdated({ capabilities: null }))
    );
    expect(state.audioCapabilities).toEqual({ capabilities: null, loaded: true });
  });
});
