import { screen } from "@testing-library/react";

import RecordingListContainer from "../RecordingList.container";
import { renderWithStore } from "../../../testUtils";
import { mergeMockState, mockJobsState, mockRecordingState } from "../../../testUtils/mockState";
import type { ProcessingJob } from "../../../domain";
import type { Recording } from "../../../domain";
import "../../../i18n";

jest.mock("../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

const makeRecording = (overrides: Partial<Recording> = {}): Recording => ({
  id: "rec-1",
  fileName: "sample.mp3",
  filePath: "/tmp/sample.mp3",
  sha256: "abc",
  duration: "00:01:00",
  format: "Mp3",
  sourceType: "Imported",
  status: "Failed",
  createdAt: "2026-04-19T20:00:00Z",
  ...overrides,
});

const makeJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "Failed",
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

describe("RecordingList user hint rendering", () => {
  it("shows userHint text when job is Failed and userHint is non-null", () => {
    const rec = makeRecording();
    const job = makeJob({ userHint: "Whisper model missing. Settings → Models" });

    const state = mergeMockState(
      mockRecordingState({ recordings: { "rec-1": rec } }),
      mockJobsState({ byId: { "job-1": job } })
    );

    renderWithStore(<RecordingListContainer />, { preloadedState: state });

    expect(screen.getByTestId("user-hint-rec-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-hint-rec-1").textContent).toBe(
      "Whisper model missing. Settings → Models"
    );
  });

  it("shows errorMessage as fallback when job is Failed with null userHint but non-null errorMessage", () => {
    const rec = makeRecording();
    const job = makeJob({ userHint: null, errorMessage: "generic pipeline error" });

    const state = mergeMockState(
      mockRecordingState({ recordings: { "rec-1": rec } }),
      mockJobsState({ byId: { "job-1": job } })
    );

    renderWithStore(<RecordingListContainer />, { preloadedState: state });

    expect(screen.getByTestId("user-hint-rec-1").textContent).toBe("generic pipeline error");
  });

  it("does NOT render user-hint when job is Done", () => {
    const rec = makeRecording({ status: "Transcribed" });
    const job = makeJob({ status: "Done", userHint: null, errorMessage: null });

    const state = mergeMockState(
      mockRecordingState({ recordings: { "rec-1": rec } }),
      mockJobsState({ byId: { "job-1": job } })
    );

    renderWithStore(<RecordingListContainer />, { preloadedState: state });

    expect(screen.queryByTestId("user-hint-rec-1")).toBeNull();
  });
});
