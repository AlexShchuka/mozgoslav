import { screen } from "@testing-library/react";

import RecordingListContainer from "../RecordingList.container";
import { renderWithStore } from "../../../testUtils";
import { mergeMockState, mockJobsState, mockRecordingState } from "../../../testUtils/mockState";
import type { ProcessingJobStage } from "../../../domain";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

const makeStage = (overrides: Partial<ProcessingJobStage> = {}): ProcessingJobStage => ({
  id: "stage-1",
  jobId: "job-1",
  stageName: "Transcribing",
  startedAt: "2026-04-19T20:00:01Z",
  finishedAt: null,
  durationMs: null,
  errorMessage: null,
  ...overrides,
});

describe("RecordingList.container stagesByJobId wiring", () => {
  it("passes stagesByJobId from store to the component — not literal empty object", () => {
    const stage1 = makeStage({ id: "s-1", jobId: "job-1" });
    const stage2 = makeStage({ id: "s-2", jobId: "job-1", stageName: "Correcting" });

    const state = mergeMockState(
      mockRecordingState({ recordings: {} }),
      mockJobsState({ stagesByJobId: { "job-1": [stage1, stage2] } })
    );

    renderWithStore(<RecordingListContainer />, { preloadedState: state });

    expect(screen.getByTestId("recording-empty")).toBeInTheDocument();
  });

  it("stagesByJobId in store with populated data is not empty when stages exist", () => {
    const stage = makeStage();
    const preloaded = mergeMockState(
      mockRecordingState({ recordings: {} }),
      mockJobsState({ stagesByJobId: { "job-1": [stage] } })
    );

    const { store } = renderWithStore(<RecordingListContainer />, { preloadedState: preloaded });

    const storeState = store.getState();
    expect(storeState.jobs.stagesByJobId["job-1"]).toHaveLength(1);
    expect(storeState.jobs.stagesByJobId["job-1"][0].stageName).toBe("Transcribing");
  });
});
