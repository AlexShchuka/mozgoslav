import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomeList from "../HomeList";
import { lightTheme } from "../../../styles/theme";
import type { ProcessingJob } from "../../../domain/ProcessingJob";
import type { Recording } from "../../../domain/Recording";
import { loadRecordings, deleteRecording } from "../../../store/slices/recording";
import { cancelJob as cancelJobAction, jobUpdated } from "../../../store/slices/jobs";
import { openNoteRequested } from "../../../store/slices/ui";
import {
  renderWithStore,
  mockRecordingState,
  mockJobsState,
  recordingsById,
  jobsById,
  mergeMockState,
} from "../../../testUtils";
import "../../../i18n";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => null,
}));

const buildRecording = (patch: Partial<Recording> = {}): Recording => ({
  id: patch.id ?? "rec-1",
  fileName: patch.fileName ?? "test-recording.mp3",
  filePath: patch.filePath ?? "/tmp/test-recording.mp3",
  sha256: patch.sha256 ?? "abc123",
  duration: patch.duration ?? "00:01:00",
  format: patch.format ?? "Mp3",
  sourceType: patch.sourceType ?? "Recorded",
  status: patch.status ?? "New",
  createdAt: patch.createdAt ?? new Date("2026-04-17T12:00:00Z").toISOString(),
});

const buildJob = (patch: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: patch.id ?? "job-1",
  recordingId: patch.recordingId ?? "rec-1",
  profileId: patch.profileId ?? "profile-default",
  status: patch.status ?? "Queued",
  progress: patch.progress ?? 0,
  currentStep: patch.currentStep ?? null,
  errorMessage: patch.errorMessage ?? null,
  userHint: patch.userHint ?? null,
  createdAt: patch.createdAt ?? new Date("2026-04-17T12:00:00Z").toISOString(),
  startedAt: patch.startedAt ?? null,
  finishedAt: patch.finishedAt ?? null,
  resumedFromCheckpoint: patch.resumedFromCheckpoint,
  checkpointAt: patch.checkpointAt,
});

const renderHomeList = (
  preloadedState: Partial<import("../../../store/rootReducer").GlobalState> = {}
) =>
  renderWithStore(
    <MemoryRouter>
      <HomeList />
    </MemoryRouter>,
    { preloadedState, theme: lightTheme }
  );

beforeEach(() => {
  jest.clearAllMocks();
});

describe("HomeList — on mount", () => {
  it("HomeList_OnMount_DispatchesLoadRecordings", () => {
    const { getActions } = renderHomeList();
    expect(getActions()).toContainEqual(loadRecordings());
  });
});

describe("HomeList — rendering from store", () => {
  it("HomeList_RendersRecordingsFromStore", async () => {
    const rec1 = buildRecording({ id: "rec-a", fileName: "alpha.mp3" });
    const rec2 = buildRecording({ id: "rec-b", fileName: "beta.mp3" });
    renderHomeList(
      mergeMockState(mockRecordingState({ recordings: recordingsById([rec1, rec2]) }))
    );

    expect(await screen.findByText("alpha.mp3")).toBeInTheDocument();
    expect(screen.getByText("beta.mp3")).toBeInTheDocument();
  });
});

describe("HomeList — delete", () => {
  it("HomeList_DeleteClick_ConfirmsAndDispatchesDeleteAction", async () => {
    const rec = buildRecording({ id: "rec-del-1" });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    const { getActions } = renderHomeList(
      mergeMockState(mockRecordingState({ recordings: recordingsById([rec]) }))
    );

    const deleteBtn = await screen.findByTestId(`home-delete-${rec.id}`);
    await userEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(getActions()).toContainEqual(deleteRecording(rec.id));

    confirmSpy.mockRestore();
  });

  it("HomeList_DeleteDeclined_DoesNotDispatch", async () => {
    const rec = buildRecording({ id: "rec-del-2" });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);

    const { getActions } = renderHomeList(
      mergeMockState(mockRecordingState({ recordings: recordingsById([rec]) }))
    );

    const deleteBtn = await screen.findByTestId(`home-delete-${rec.id}`);
    await userEvent.click(deleteBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(getActions()).not.toContainEqual(deleteRecording(rec.id));

    confirmSpy.mockRestore();
  });
});

describe("HomeList — cancel", () => {
  it("HomeList_CancelClick_OnQueuedJob_DispatchesCancelAction", async () => {
    const rec = buildRecording({ id: "rec-cancel-1" });
    const job = buildJob({ id: "job-cancel-1", recordingId: "rec-cancel-1", status: "Queued" });

    const { getActions } = renderHomeList(
      mergeMockState(
        mockRecordingState({ recordings: recordingsById([rec]) }),
        mockJobsState({ byId: jobsById([job]) })
      )
    );

    const cancelBtn = await screen.findByTestId(`home-cancel-${rec.id}`);
    await userEvent.click(cancelBtn);

    expect(getActions()).toContainEqual(cancelJobAction(job.id));
  });
});

describe("HomeList — open note", () => {
  it("HomeList_OpenNoteClick_OnDoneRecording_DispatchesOpenNoteRequested", async () => {
    const rec = buildRecording({ id: "rec-note-1" });
    const job = buildJob({
      id: "job-note-1",
      recordingId: "rec-note-1",
      status: "Done",
      progress: 100,
    });

    const { getActions } = renderHomeList(
      mergeMockState(
        mockRecordingState({ recordings: recordingsById([rec]) }),
        mockJobsState({ byId: jobsById([job]) })
      )
    );

    const openNoteBtn = await screen.findByTestId(`home-open-note-${rec.id}`);
    await userEvent.click(openNoteBtn);

    expect(getActions()).toContainEqual(openNoteRequested(rec.id));
  });
});

describe("HomeList — subscription push", () => {
  it("HomeList_SubscriptionPush_UpdatesRowStatus", async () => {
    const rec = buildRecording({ id: "rec-live-1" });

    const { store } = renderHomeList(
      mergeMockState(mockRecordingState({ recordings: recordingsById([rec]) }))
    );

    const job = buildJob({
      id: "job-live-1",
      recordingId: "rec-live-1",
      status: "Transcribing",
      progress: 40,
    });

    store.dispatch(jobUpdated(job) as never);

    await waitFor(() => expect(screen.getByTestId(`home-cancel-${rec.id}`)).toBeInTheDocument());
  });
});
