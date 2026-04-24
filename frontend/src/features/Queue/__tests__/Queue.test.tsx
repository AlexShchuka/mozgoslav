import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Queue from "../Queue";
import { lightTheme } from "../../../styles/theme";
import { ProcessingJob } from "../../../domain/ProcessingJob";
import { cancelJob as cancelJobAction, jobUpdated } from "../../../store/slices/jobs";
import { renderWithStore, mockJobsState, jobsById } from "../../../testUtils";
import "../../../i18n";

jest.mock("react-toastify", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: () => null,
}));

const buildJob = (patch: Partial<ProcessingJob>): ProcessingJob => ({
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Queue — cancel UI (BC-015 / Bug 19)", () => {
  it("Queue_CancelQueued_DispatchesCancelJob", async () => {
    const job = buildJob({ id: "job-q", status: "Queued" });
    const { getActions } = renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([job]) }),
      theme: lightTheme,
    });

    const cancelBtn = await screen.findByTestId(`queue-cancel-${job.id}`);
    expect(cancelBtn).toBeEnabled();
    await userEvent.click(cancelBtn);

    expect(getActions()).toContainEqual(cancelJobAction(job.id));
  });

  it("Queue_CancelRunning_Confirmation_DispatchesCancel", async () => {
    const job = buildJob({ id: "job-r", status: "Transcribing", progress: 30 });
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    const { getActions } = renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([job]) }),
      theme: lightTheme,
    });

    const cancelBtn = await screen.findByTestId(`queue-cancel-${job.id}`);
    await userEvent.click(cancelBtn);

    expect(confirmSpy).toHaveBeenCalled();
    expect(getActions()).toContainEqual(cancelJobAction(job.id));

    confirmSpy.mockRestore();
  });

  it("Queue_CancelHidden_OnDoneAndFailed", async () => {
    const done = buildJob({ id: "job-done-001", status: "Done", progress: 100 });
    const failed = buildJob({ id: "job-fail-001", status: "Failed" });

    renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([done, failed]) }),
      theme: lightTheme,
    });

    await waitFor(() => expect(screen.getAllByText(/Готово|Done/).length).toBeGreaterThan(0));
    expect(screen.queryByTestId(`queue-cancel-${done.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`queue-cancel-${failed.id}`)).not.toBeInTheDocument();
  });

  it("Queue_SubscriptionPush_UpdatesList", async () => {
    const job = buildJob({ id: "job-live", status: "Transcribing", progress: 10 });

    const { store } = renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: {} }),
      theme: lightTheme,
    });

    store.dispatch(jobUpdated(job) as never);

    await waitFor(() => expect(screen.getByTestId(`queue-cancel-${job.id}`)).toBeInTheDocument());
  });
});

describe("Queue — ADR-015 cancelled terminal state", () => {
  it("Queue_RendersCancelledStatusBadge_WithNeutralTone_AndNoCancelButton", async () => {
    const job = buildJob({
      id: "job-cancelled-001",
      status: "Cancelled",
      finishedAt: new Date("2026-04-18T09:00:00Z").toISOString(),
    });

    renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([job]) }),
      theme: lightTheme,
    });

    await waitFor(() =>
      expect(screen.getAllByText(/Отменено|Cancelled/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByTestId(`queue-cancel-${job.id}`)).not.toBeInTheDocument();
  });
});

describe("Queue — resume copy (BC-017 / Bug 21)", () => {
  it("Queue_Row_Shows_ResumedFromHHMM_WhenResumed", async () => {
    const job = buildJob({
      id: "job-resume",
      status: "Transcribing",
      progress: 20,
      resumedFromCheckpoint: true,
      checkpointAt: "2026-04-17T07:23:00Z",
    });

    renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([job]) }),
      theme: lightTheme,
    });

    expect(await screen.findByText(/Resumed from|Возобновлено с/)).toBeInTheDocument();
  });

  it("Queue_Row_NoResumedCopy_WhenFlagFalse", async () => {
    const job = buildJob({
      id: "job-plain-001",
      status: "Transcribing",
      progress: 20,
    });

    renderWithStore(<Queue />, {
      preloadedState: mockJobsState({ byId: jobsById([job]) }),
      theme: lightTheme,
    });

    await waitFor(() =>
      expect(screen.getAllByText(/Транскрибация|Transcribing/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/Resumed from|Возобновлено с/)).not.toBeInTheDocument();
  });
});
