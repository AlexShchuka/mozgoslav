import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

import type { JobStage, JobStatus, ProcessingJob, ProcessingJobStage } from "../../domain";
import Button from "../Button";
import {
  Connector,
  JobControls,
  Root,
  StageActions,
  StageChip,
  StageIcon,
  StageName,
  StagesRow,
  Tooltip,
  type StageState,
} from "./JobTimeline.style";

export interface JobTimelineProps {
  job: ProcessingJob;
  stages: ProcessingJobStage[];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRetryFromStage: (stage: JobStage, skipFailed: boolean) => void;
}

const ORDERED_STAGES: JobStage[] = [
  "Transcribing",
  "Correcting",
  "LlmCorrection",
  "Summarizing",
  "Exporting",
];

const STAGE_NAME_KEYS: Record<JobStage, string> = {
  Transcribing: "pipeline.timeline.stage.transcribing",
  Correcting: "pipeline.timeline.stage.correcting",
  LlmCorrection: "pipeline.timeline.stage.llmCorrection",
  Summarizing: "pipeline.timeline.stage.summarizing",
  Exporting: "pipeline.timeline.stage.exporting",
};

const RUNNING_STATUSES: ReadonlySet<JobStatus> = new Set([
  "PreflightChecks",
  "Transcribing",
  "Correcting",
  "Summarizing",
  "Exporting",
]);

const PAUSEABLE_STATUSES: ReadonlySet<JobStatus> = new Set([
  "PreflightChecks",
  "Transcribing",
  "Correcting",
  "Summarizing",
  "Exporting",
]);

const CANCELABLE_STATUSES: ReadonlySet<JobStatus> = new Set([
  "Queued",
  "PreflightChecks",
  "Transcribing",
  "Correcting",
  "Summarizing",
  "Exporting",
  "Paused",
]);

const STATE_ICONS: Record<StageState, string> = {
  done: "✓",
  failed: "✗",
  paused: "⏸",
  pending: "⏳",
  running: "▶",
  skipped: "⊘",
};

function deriveStageState(
  stage: JobStage,
  stageRecord: ProcessingJobStage | undefined,
  jobStatus: JobStatus
): StageState {
  if (!stageRecord) {
    if (RUNNING_STATUSES.has(jobStatus) && (jobStatus as string) === stage) {
      return "running";
    }
    return "pending";
  }
  if (stageRecord.errorMessage === "SKIPPED") {
    return "skipped";
  }
  if (stageRecord.errorMessage) {
    return "failed";
  }
  if (stageRecord.finishedAt === null) {
    if (jobStatus === "Paused") {
      return "paused";
    }
    return "running";
  }
  return "done";
}

const FAILED_RETRY_ELIGIBLE: ReadonlySet<JobStatus> = new Set([
  "Failed",
  "Cancelled",
  "Paused",
  "Done",
]);

function formatDurationSeconds(ms: number | null): string {
  if (ms === null) {
    return "";
  }
  const seconds = Math.round(ms / 1000);
  return String(seconds);
}

interface StageChipItemProps {
  stage: JobStage;
  stageRecord: ProcessingJobStage | undefined;
  state: StageState;
  jobStatus: JobStatus;
  onRetryFromStage: (stage: JobStage, skipFailed: boolean) => void;
}

const StageChipItem: FC<StageChipItemProps> = ({
  stage,
  stageRecord,
  state,
  jobStatus,
  onRetryFromStage,
}) => {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);

  const showRetryButtons = state === "failed" && FAILED_RETRY_ELIGIBLE.has(jobStatus);
  const durationSeconds = stageRecord?.durationMs
    ? formatDurationSeconds(stageRecord.durationMs)
    : null;
  const hasTooltip = hovered && (durationSeconds !== null || stageRecord?.errorMessage);

  return (
    <StageChip
      $state={state}
      data-testid={`stage-chip-${stage}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <StageIcon>{STATE_ICONS[state]}</StageIcon>
      <StageName>{(t as (key: string) => string)(STAGE_NAME_KEYS[stage])}</StageName>
      {showRetryButtons && (
        <StageActions>
          <Button
            size="sm"
            variant="danger"
            onClick={() => onRetryFromStage(stage, false)}
            data-testid={`retry-stage-${stage}`}
          >
            {t("pipeline.timeline.action.retry")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onRetryFromStage(stage, true)}
            data-testid={`skip-stage-${stage}`}
          >
            {t("pipeline.timeline.action.skip")}
          </Button>
        </StageActions>
      )}
      {hasTooltip && (
        <Tooltip>
          {durationSeconds !== null &&
            String(
              (t as (key: string, opts?: Record<string, unknown>) => string)(
                "pipeline.timeline.tooltip.duration",
                { seconds: durationSeconds }
              )
            ) + " "}
          {stageRecord?.errorMessage && stageRecord.errorMessage !== "SKIPPED"
            ? stageRecord.errorMessage
            : null}
        </Tooltip>
      )}
    </StageChip>
  );
};

const JobTimeline: FC<JobTimelineProps> = ({
  job,
  stages,
  onPause,
  onResume,
  onCancel,
  onRetryFromStage,
}) => {
  const { t } = useTranslation();

  const stagesByName = stages.reduce<Record<string, ProcessingJobStage>>((acc, s) => {
    acc[s.stageName] = s;
    return acc;
  }, {});

  const showPause = PAUSEABLE_STATUSES.has(job.status);
  const showResume = job.status === "Paused";
  const showCancel = CANCELABLE_STATUSES.has(job.status);

  return (
    <Root data-testid="job-timeline">
      <StagesRow>
        {ORDERED_STAGES.map((stage, idx) => {
          const record = stagesByName[stage];
          const state = deriveStageState(stage, record, job.status);
          return [
            idx > 0 && <Connector key={`connector-${stage}`} />,
            <StageChipItem
              key={stage}
              stage={stage}
              stageRecord={record}
              state={state}
              jobStatus={job.status}
              onRetryFromStage={onRetryFromStage}
            />,
          ];
        })}
      </StagesRow>
      <JobControls>
        {showPause && (
          <Button size="sm" variant="secondary" onClick={onPause} data-testid="timeline-pause">
            {t("pipeline.timeline.action.pause")}
          </Button>
        )}
        {showResume && (
          <Button size="sm" variant="primary" onClick={onResume} data-testid="timeline-resume">
            {t("pipeline.timeline.action.resume")}
          </Button>
        )}
        {showCancel && (
          <Button size="sm" variant="danger" onClick={onCancel} data-testid="timeline-cancel">
            {t("pipeline.timeline.action.cancel")}
          </Button>
        )}
      </JobControls>
    </Root>
  );
};

export default JobTimeline;
