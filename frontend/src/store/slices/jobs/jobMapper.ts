import type { ProcessingJob } from "../../../domain/ProcessingJob";
import { JobStatus as GqlJobStatus } from "../../../api/gql/graphql";

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
};

function gqlJobStatusToDomain(s: GqlJobStatus): ProcessingJob["status"] {
  const map: Record<GqlJobStatus, ProcessingJob["status"]> = {
    [GqlJobStatus.Queued]: "Queued",
    [GqlJobStatus.PreflightChecks]: "PreflightChecks",
    [GqlJobStatus.Transcribing]: "Transcribing",
    [GqlJobStatus.Correcting]: "Correcting",
    [GqlJobStatus.LlmCorrection]: "LlmCorrection",
    [GqlJobStatus.Summarizing]: "Summarizing",
    [GqlJobStatus.Exporting]: "Exporting",
    [GqlJobStatus.Done]: "Done",
    [GqlJobStatus.Failed]: "Failed",
    [GqlJobStatus.Cancelled]: "Cancelled",
    [GqlJobStatus.Paused]: "Paused",
  };
  return map[s] ?? "Queued";
}

export function mapGqlJob(j: GqlJobNode): ProcessingJob {
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
  };
}
