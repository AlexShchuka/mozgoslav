import { screen } from "@testing-library/react";

import LiveTranscript from "../LiveTranscript";
import {
  renderWithStore,
  mergeMockState,
  mockRecordingState,
  mockJobsState,
  jobsById,
} from "../../../testUtils";
import type { ProcessingJob } from "../../../domain/ProcessingJob";
import i18n from "../../../i18n";

beforeAll(async () => {
  await i18n.changeLanguage("en");
});

afterAll(async () => {
  await i18n.changeLanguage("ru");
});

jest.mock("../../../store/slices/recording/saga", () => ({
  watchRecordingSagas: function* () {},
}));

const buildJob = (patch: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: patch.id ?? "job-1",
  recordingId: patch.recordingId ?? "rec-1",
  profileId: patch.profileId ?? "profile-1",
  status: patch.status ?? "Queued",
  progress: patch.progress ?? 0,
  currentStep: patch.currentStep ?? null,
  errorMessage: patch.errorMessage ?? null,
  userHint: patch.userHint ?? null,
  createdAt: patch.createdAt ?? new Date("2026-04-17T12:00:00Z").toISOString(),
  startedAt: patch.startedAt ?? null,
  finishedAt: patch.finishedAt ?? null,
});

const renderLiveTranscript = (job: ProcessingJob | null, recordingId = "rec-1") => {
  const preloaded = mergeMockState(
    mockRecordingState(),
    mockJobsState(job ? { byId: jobsById([job]) } : {})
  );
  return renderWithStore(<LiveTranscript recordingId={recordingId} />, {
    preloadedState: preloaded,
  });
};

describe("LiveTranscript — context-aware status label", () => {
  it("shows listening label when no job exists", () => {
    renderLiveTranscript(null);
    expect(screen.getByText("Listening…")).toBeInTheDocument();
  });

  it("shows transcribing label when job status is Transcribing", () => {
    const job = buildJob({ status: "Transcribing" });
    renderLiveTranscript(job);
    expect(screen.getByText("Transcribing…")).toBeInTheDocument();
  });

  it("shows cleaning-transcript label when job status is Correcting", () => {
    const job = buildJob({ status: "Correcting" });
    renderLiveTranscript(job);
    expect(screen.getByText("Cleaning transcript…")).toBeInTheDocument();
  });

  it("shows summarizing label when job status is Summarizing", () => {
    const job = buildJob({ status: "Summarizing" });
    renderLiveTranscript(job);
    expect(screen.getByText("Summarizing…")).toBeInTheDocument();
  });

  it("shows exporting label when job status is Exporting", () => {
    const job = buildJob({ status: "Exporting" });
    renderLiveTranscript(job);
    expect(screen.getByText("Exporting…")).toBeInTheDocument();
  });
});
