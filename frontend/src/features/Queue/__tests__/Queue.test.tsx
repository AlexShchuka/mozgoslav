import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "styled-components";

import Queue from "../Queue";
import { lightTheme } from "../../../styles/theme";
import { ProcessingJob } from "../../../domain/ProcessingJob";
import "../../../i18n";

type JobSink = {
  next: (value: { data: { jobProgress: ProcessingJob } }) => void;
  error: (err: unknown) => void;
  complete: () => void;
};

let activeJobSink: JobSink | null = null;
// eslint-disable-next-line no-var -- jest.mock factories run before `let` is initialised; `var` keeps hoisting semantics
var mockRequest: jest.Mock;

jest.mock("../../../api/graphqlClient", () => {
  mockRequest = jest.fn();
  return {
    graphqlClient: { request: mockRequest },
    getGraphqlWsClient: jest.fn(() => ({
      subscribe: jest.fn((_query: unknown, sink: JobSink) => {
        activeJobSink = sink;
        return () => {};
      }),
      dispose: jest.fn(),
    })),
  };
});

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

const renderQueue = () =>
  render(
    <ThemeProvider theme={lightTheme}>
      <Queue />
    </ThemeProvider>
  );

beforeEach(() => {
  jest.clearAllMocks();
  activeJobSink = null;
});

describe("Queue — cancel UI (BC-015 / Bug 19)", () => {
  it("Queue_CancelQueued_FiresDelete_RemovesRow", async () => {
    const job = buildJob({ id: "job-q", status: "Queued" });
    mockRequest
      .mockResolvedValueOnce({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } })
      .mockResolvedValueOnce({ cancelJob: { errors: [] } });

    renderQueue();

    const cancelBtn = await screen.findByTestId(`queue-cancel-${job.id}`);
    expect(cancelBtn).toBeEnabled();
    await userEvent.click(cancelBtn);

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: job.id })
      )
    );
  });

  it("Queue_CancelRunning_Confirmation_CallsDelete", async () => {
    const job = buildJob({ id: "job-r", status: "Transcribing", progress: 30 });
    mockRequest
      .mockResolvedValueOnce({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } })
      .mockResolvedValueOnce({ cancelJob: { errors: [] } });

    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

    renderQueue();
    const cancelBtn = await screen.findByTestId(`queue-cancel-${job.id}`);
    await userEvent.click(cancelBtn);

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: job.id })
      )
    );
    expect(confirmSpy).toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  it("Queue_CancelHidden_OnDoneAndFailed", async () => {
    const done = buildJob({ id: "job-done-001", status: "Done", progress: 100 });
    const failed = buildJob({ id: "job-fail-001", status: "Failed" });
    mockRequest.mockResolvedValue({
      jobs: { nodes: [done, failed], pageInfo: { hasNextPage: false } },
    });

    renderQueue();

    await waitFor(() => expect(screen.getAllByText(/Готово|Done/).length).toBeGreaterThan(0));
    expect(screen.queryByTestId(`queue-cancel-${done.id}`)).not.toBeInTheDocument();
    expect(screen.queryByTestId(`queue-cancel-${failed.id}`)).not.toBeInTheDocument();
  });

  it("Queue_SseReconnect_OnConnectionLoss — subscription updates job list", async () => {
    const job = buildJob({ id: "job-live", status: "Transcribing", progress: 10 });
    mockRequest.mockResolvedValue({ jobs: { nodes: [], pageInfo: { hasNextPage: false } } });

    renderQueue();

    await waitFor(() => expect(activeJobSink).not.toBeNull());

    act(() => {
      activeJobSink!.next({ data: { jobProgress: job } });
    });

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
    mockRequest.mockResolvedValue({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } });

    renderQueue();

    await waitFor(() =>
      expect(screen.getAllByText(/Отменено|Cancelled/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByTestId(`queue-cancel-${job.id}`)).not.toBeInTheDocument();
  });

  it("Queue_CancelOnSuccess_DoesNotShowToastError", async () => {
    const job = buildJob({ id: "job-cancel-ok-001", status: "Queued" });
    mockRequest
      .mockResolvedValueOnce({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } })
      .mockResolvedValueOnce({ cancelJob: { errors: [] } });

    const { toast } = jest.requireMock("react-toastify") as {
      toast: { error: jest.Mock };
    };

    renderQueue();
    const cancelBtn = await screen.findByTestId(`queue-cancel-${job.id}`);
    await userEvent.click(cancelBtn);

    await waitFor(() =>
      expect(mockRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: job.id })
      )
    );
    expect(toast.error).not.toHaveBeenCalled();
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
    mockRequest.mockResolvedValue({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } });

    renderQueue();

    expect(await screen.findByText(/Resumed from|Возобновлено с/)).toBeInTheDocument();
  });

  it("Queue_Row_NoResumedCopy_WhenFlagFalse", async () => {
    const job = buildJob({
      id: "job-plain-001",
      status: "Transcribing",
      progress: 20,
    });
    mockRequest.mockResolvedValue({ jobs: { nodes: [job], pageInfo: { hasNextPage: false } } });

    renderQueue();

    await waitFor(() =>
      expect(screen.getAllByText(/Транскрибация|Transcribing/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(/Resumed from|Возобновлено с/)).not.toBeInTheDocument();
  });
});
