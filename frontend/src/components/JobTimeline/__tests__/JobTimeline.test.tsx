import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { I18nextProvider } from "react-i18next";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { lightTheme } from "../../../styles/theme";
import type { ProcessingJob, ProcessingJobStage } from "../../../domain";
import JobTimeline from "../JobTimeline";

const testI18n = i18n.createInstance();
testI18n.use(initReactI18next).init({
  lng: "en",
  resources: {
    en: {
      translation: {
        "pipeline.timeline.stage.transcribing": "Transcribing",
        "pipeline.timeline.stage.correcting": "Correcting",
        "pipeline.timeline.stage.llmCorrection": "LLM",
        "pipeline.timeline.stage.summarizing": "Summary",
        "pipeline.timeline.stage.exporting": "Exporting",
        "pipeline.timeline.action.retry": "Retry",
        "pipeline.timeline.action.skip": "Skip",
        "pipeline.timeline.action.pause": "Pause",
        "pipeline.timeline.action.resume": "Resume",
        "pipeline.timeline.action.cancel": "Cancel",
        "pipeline.timeline.tooltip.duration": "{{seconds}} s",
      },
    },
  },
});

const renderTimeline = (
  job: ProcessingJob,
  stages: ProcessingJobStage[] = [],
  handlers = {
    onPause: jest.fn(),
    onResume: jest.fn(),
    onCancel: jest.fn(),
    onRetryFromStage: jest.fn(),
  }
) =>
  render(
    <I18nextProvider i18n={testI18n}>
      <ThemeProvider theme={lightTheme}>
        <JobTimeline
          job={job}
          stages={stages}
          onPause={handlers.onPause}
          onResume={handlers.onResume}
          onCancel={handlers.onCancel}
          onRetryFromStage={handlers.onRetryFromStage}
        />
      </ThemeProvider>
    </I18nextProvider>
  );

const makeJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "Queued",
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...overrides,
});

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

describe("JobTimeline", () => {
  it("renders all 5 stage chips (all-pending state)", () => {
    const { container } = renderTimeline(makeJob({ status: "Queued" }));
    expect(container).toMatchSnapshot();
    expect(screen.getByTestId("stage-chip-Transcribing")).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip-Correcting")).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip-LlmCorrection")).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip-Summarizing")).toBeInTheDocument();
    expect(screen.getByTestId("stage-chip-Exporting")).toBeInTheDocument();
  });

  it("shows Pause and Cancel buttons when job is running", () => {
    const { container } = renderTimeline(makeJob({ status: "Transcribing" }));
    expect(container).toMatchSnapshot();
    expect(screen.getByTestId("timeline-pause")).toBeInTheDocument();
    expect(screen.getByTestId("timeline-cancel")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-resume")).toBeNull();
  });

  it("shows Resume button (not Pause) when job is Paused", () => {
    const { container } = renderTimeline(makeJob({ status: "Paused" }), [
      makeStage({
        stageName: "Transcribing",
        finishedAt: "2026-04-19T20:01:00Z",
        durationMs: 60000,
      }),
    ]);
    expect(container).toMatchSnapshot();
    expect(screen.getByTestId("timeline-resume")).toBeInTheDocument();
    expect(screen.queryByTestId("timeline-pause")).toBeNull();
    expect(screen.getByTestId("timeline-cancel")).toBeInTheDocument();
  });

  it("shows Retry and Skip buttons on failed stage", () => {
    const { container } = renderTimeline(makeJob({ status: "Failed" }), [
      makeStage({
        stageName: "Transcribing",
        finishedAt: "2026-04-19T20:01:00Z",
        durationMs: 60000,
      }),
      makeStage({
        id: "stage-2",
        stageName: "Correcting",
        finishedAt: null,
        errorMessage: "LLM error",
      }),
    ]);
    expect(container).toMatchSnapshot();
    expect(screen.getByTestId("retry-stage-Correcting")).toBeInTheDocument();
    expect(screen.getByTestId("skip-stage-Correcting")).toBeInTheDocument();
  });

  it("shows no job controls when job is Done", () => {
    const { container } = renderTimeline(makeJob({ status: "Done" }));
    expect(container).toMatchSnapshot();
    expect(screen.queryByTestId("timeline-pause")).toBeNull();
    expect(screen.queryByTestId("timeline-resume")).toBeNull();
    expect(screen.queryByTestId("timeline-cancel")).toBeNull();
  });

  it("calls onPause when Pause button is clicked", () => {
    const onPause = jest.fn();
    renderTimeline(makeJob({ status: "Transcribing" }), [], {
      onPause,
      onResume: jest.fn(),
      onCancel: jest.fn(),
      onRetryFromStage: jest.fn(),
    });
    fireEvent.click(screen.getByTestId("timeline-pause"));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("calls onResume when Resume button is clicked", () => {
    const onResume = jest.fn();
    renderTimeline(makeJob({ status: "Paused" }), [], {
      onPause: jest.fn(),
      onResume,
      onCancel: jest.fn(),
      onRetryFromStage: jest.fn(),
    });
    fireEvent.click(screen.getByTestId("timeline-resume"));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when Cancel button is clicked", () => {
    const onCancel = jest.fn();
    renderTimeline(makeJob({ status: "Transcribing" }), [], {
      onPause: jest.fn(),
      onResume: jest.fn(),
      onCancel,
      onRetryFromStage: jest.fn(),
    });
    fireEvent.click(screen.getByTestId("timeline-cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("failed stage chip with non-null errorMessage shows ✗ icon and Retry+Skip buttons", () => {
    renderTimeline(makeJob({ status: "Failed" }), [
      makeStage({
        stageName: "Transcribing",
        finishedAt: "2026-04-19T20:01:00Z",
        durationMs: 60000,
      }),
      makeStage({ id: "stage-2", stageName: "Correcting", errorMessage: "LLM timeout" }),
    ]);
    expect(screen.getByTestId("retry-stage-Correcting")).toBeInTheDocument();
    expect(screen.getByTestId("skip-stage-Correcting")).toBeInTheDocument();
  });

  it("running stage chip when job.status matches stage name shows ▶ icon", () => {
    renderTimeline(makeJob({ status: "Transcribing" }), []);
    const chip = screen.getByTestId("stage-chip-Transcribing");
    expect(chip.textContent).toContain("▶");
  });

  it("skipped chip when errorMessage is SKIPPED shows ⊘ icon", () => {
    renderTimeline(makeJob({ status: "Failed" }), [
      makeStage({ stageName: "Correcting", errorMessage: "SKIPPED" }),
    ]);
    const chip = screen.getByTestId("stage-chip-Correcting");
    expect(chip.textContent).toContain("⊘");
  });
});
