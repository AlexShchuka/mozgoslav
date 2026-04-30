import type { ProcessingJob } from "../../../domain/ProcessingJob";
import type { ProcessingJobStage } from "../../../domain/ProcessingJobStage";
import { JobStatus as GqlJobStatus } from "../../../api/gql/graphql";

type GqlStageNode = {
  id: string;
  jobId: string;
  stageName: string;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  errorMessage?: string | null;
};

type GqlJobNode = {
  id: string;
  recordingId: string;
  profileId: string;
  status: GqlJobStatus;
  progress: number;
  currentStep?: string | null;
  errorMessage?: string | null;
  userHint?: string | null;
  createdAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  stages?: ReadonlyArray<Record<string, unknown>> | null;
};

export type MappedJob = ProcessingJob & { stages: ProcessingJobStage[] };

function gqlJobStatusToDomain(s: GqlJobStatus): ProcessingJob["status"] {
  const map: Record<GqlJobStatus, ProcessingJob["status"]> = {
    [GqlJobStatus.Queued]: "Queued",
    [GqlJobStatus.PreflightChecks]: "PreflightChecks",
    [GqlJobStatus.Transcribing]: "Transcribing",
    [GqlJobStatus.Correcting]: "Correcting",
    [GqlJobStatus.Summarizing]: "Summarizing",
    [GqlJobStatus.Exporting]: "Exporting",
    [GqlJobStatus.Done]: "Done",
    [GqlJobStatus.Failed]: "Failed",
    [GqlJobStatus.Cancelled]: "Cancelled",
    [GqlJobStatus.Paused]: "Paused",
  };
  return map[s] ?? "Queued";
}

function mapGqlStage(s: GqlStageNode): ProcessingJobStage {
  return {
    id: s.id,
    jobId: s.jobId,
    stageName: s.stageName,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt ?? null,
    durationMs: s.durationMs ?? null,
    errorMessage: s.errorMessage ?? null,
  };
}

export function mapGqlJob(j: GqlJobNode): MappedJob {
  const stages = (j.stages ?? []).map((s) => mapGqlStage(s as unknown as GqlStageNode));
  return {
    id: j.id,
    recordingId: j.recordingId,
    profileId: j.profileId,
    status: gqlJobStatusToDomain(j.status),
    progress: j.progress,
    currentStep: j.currentStep ?? null,
    errorMessage: j.errorMessage ?? null,
    userHint: j.userHint ?? null,
    createdAt: j.createdAt,
    startedAt: j.startedAt ?? null,
    finishedAt: j.finishedAt ?? null,
    stages,
  };
}
