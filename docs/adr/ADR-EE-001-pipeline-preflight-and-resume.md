# ADR-EE-001 — Pipeline preflight checks and idempotent stage resume

## Context

The processing pipeline (transcribe → correct → summarize → export) could fail silently
when a required resource was missing (Whisper model not downloaded, vault path not writable).
The user saw only a generic "Failed" status with no actionable hint.

Additionally, if a job failed mid-pipeline, a full restart from the beginning was the only
recovery path — even when expensive steps (transcription) had already completed successfully.

## Decision

### PreflightChecks stage (#239 #231)

A `PreflightChecks` value is appended to the `JobStatus` enum (stored as string → no schema
migration required). `RunPipelineAsync` calls `RunPreflightChecksAsync` before the first
real stage. Checks performed in order:

1. Whisper model file — `File.Exists(settings.WhisperModelPath)`. Failure sets
   `ProcessingJob.UserHint` to a human-readable message ("Whisper model '…' missing.
   Settings → Models") and marks the job `Failed` without throwing. No exception escapes.

2. Vault path writeable — write + delete a probe file. Failure sets `UserHint` and marks
   `Failed` without throwing.

`UserError` surface: the `userHint` field on `ProcessingJob` is already exposed via
GraphQL (see `JobQueryType`). Consumers read it and render it in the UI.

### Idempotent stages + resume (#249)

`RunPipelineAsync` queries `ProcessingJobStage` history at startup and skips stages where
`FinishedAt != null && ErrorMessage == null`. This means a re-queued job resumes from the
first incomplete or failed stage rather than restarting from scratch.

The resume check happens after preflight so that preflight always reruns (resources may
have changed since the last attempt).

## Consequences

- Jobs that fail preflight complete in < 100 ms with a user-visible hint.
- Users do not need to diagnose cryptic exceptions — the hint text links to the Settings page.
- Reprocessing jobs skip already-successful stages (e.g. transcription) saving time and
  compute for downstream stages.
- Existing `ProcessingJobStage` rows written by the old pipeline are compatible: rows with
  `FinishedAt` set and no error are treated as completed.
- Adding further preflight checks in future is a single-method addition with no schema
  changes required.
