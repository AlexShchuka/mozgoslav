import type { TFunction } from "i18next";

import type { JobStatus, ProcessingJob } from "../../domain";

const STATUS_KEYS: Record<JobStatus, string> = {
  Queued: "pipeline.status.Queued",
  PreflightChecks: "pipeline.status.PreflightChecks",
  Transcribing: "pipeline.status.Transcribing",
  Correcting: "pipeline.status.Correcting",
  Summarizing: "pipeline.status.Summarizing",
  Exporting: "pipeline.status.Exporting",
  Done: "pipeline.status.Done",
  Failed: "pipeline.status.Failed",
  Cancelled: "pipeline.status.Cancelled",
  Paused: "pipeline.status.Paused",
};

const tStr = (t: TFunction, key: string): string => (t as (k: string) => string)(key);

export function getJobStatusText(job: ProcessingJob, t: TFunction): string {
  if (job.status === "Failed" && job.userHint) {
    return job.userHint;
  }
  return tStr(t, STATUS_KEYS[job.status]);
}

export function getLiveRecordingStatusText(t: TFunction): string {
  return tStr(t, "home.liveTranscriptWaiting");
}
