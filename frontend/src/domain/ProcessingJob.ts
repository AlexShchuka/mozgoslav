import type {JobStatus} from "./enums";

export interface ProcessingJob {
    id: string;
    recordingId: string;
    profileId: string;
    status: JobStatus;
    progress: number;
    currentStep: string | null;
    errorMessage: string | null;
    userHint: string | null;
    createdAt: string;
    startedAt: string | null;
    finishedAt: string | null;
    resumedFromCheckpoint?: boolean;
    checkpointAt?: string | null;
}
