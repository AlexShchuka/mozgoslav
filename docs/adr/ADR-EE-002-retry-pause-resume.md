# ADR-EE-002 — Retry / Pause / Resume on the processing pipeline

## Context

ADR-EE-001 shipped idempotent stage execution: a re-queued job resumes from the first
incomplete or failed stage (`FinishedAt == null || ErrorMessage != null`).

Remaining gaps identified in issue #248 «Pipeline UX overhaul»:

- Cancel is terminal. A user wanting to temporarily halt a running job had no choice
  other than destroying it completely and re-transcribing from scratch.
- A failed job could only be restarted from the beginning. Expensive stages (Whisper
  transcription) had to be repeated even when the failure was in a late stage such as
  Summarizing.
- No mechanism to skip a flaky stage (e.g. LLM correction unavailable) and continue the
  rest of the pipeline with the raw transcript.

Issue #248 Proposal excerpt (parent decision):
> «Pause job → current stage finalizes → status=Paused → Resume picks up.
> Failed на Summarizing → retry с Summarizing (не с Transcribing).»

## Decision

### JobStatus.Paused (#251)

`Paused` is appended to the `JobStatus` enum (string-stored; no schema migration
for the enum value itself). Paused is **recoverable** — distinct from terminal
states (Failed, Cancelled, Done).

`ProcessingJob.PauseRequested` (bool, `DEFAULT 0`) mirrors `CancelRequested`.
Migration `20260430125510_AddPauseRequested` adds the column.

`pauseJob(id)` mutation sets `PauseRequested=true`. The worker checks the flag
inside `TransitionAsync` after the current stage finalizes (`_currentStage.FinishedAt`
is written). At that boundary the job is set to `Status=Paused`, `FinishedAt` is
recorded, and the worker returns. The pipeline does not proceed to the next stage.

`resumeJob(id)` mutation validates `Status==Paused`, clears `PauseRequested`,
sets `Status=Queued`, clears `FinishedAt`, and calls `IProcessingJobScheduler.ScheduleAsync`.
The worker resumes using the existing ADR-EE-001 `_completedStageNames` skip logic.

### retryJobFromStage(input) (#250)

`retryJobFromStage(input: RetryJobFromStageInput!)` accepts `JobId`, `FromStage`
(enum `JobStage`: Transcribing | Correcting | LlmCorrection | Summarizing | Exporting),
and `SkipFailed` (default `false`). Valid from Failed, Cancelled, Paused, or Done.

`IProcessingJobRepository.RequestRetryFromStageAsync` resets the job atomically:
- `Status=Queued`, clears `ErrorMessage`, `UserHint`, `StartedAt`, `FinishedAt`,
  `Progress`, `CurrentStep`, `CancelRequested`, `PauseRequested`.
- Stage rows before `FromStage` (by canonical stage order) are left intact
  (FinishedAt+ErrorMessage preserved — they will be skipped by the worker).
- Stage rows at `FromStage` and after have `FinishedAt` and `ErrorMessage` cleared,
  so the worker re-runs them.
- `SkipFailed=true`: at `FromStage` only, `FinishedAt` is set and
  `ErrorMessage="SKIPPED"`. The worker recognizes `ErrorMessage=="SKIPPED"` as
  equivalent to completed (ADR-EE-001 condition extended to
  `ErrorMessage == null || ErrorMessage == "SKIPPED"`).

The mutation calls `IProcessingJobScheduler.ScheduleAsync` after updating the rows.

### Canonical stage order

`Transcribing audio` → `Cleaning transcript` → `LLM correction` → `Summarizing via LLM`
→ `Exporting to vault`. Used by `RequestRetryFromStageAsync` to determine which rows
are before/at/after `FromStage`.

### Pause vs Cancel

| | Cancel | Pause |
|---|---|---|
| Terminal? | Yes | No |
| Restorable? | No | Yes via resumeJob |
| CancelRequested flag | Yes | No |
| PauseRequested flag | No | Yes |
| FinishedAt set? | Yes (terminal) | Yes (temporarily) |

## Consequences

- Users can pause long-running jobs and resume without re-transcribing.
- Users can retry from any stage after a partial failure, skipping expensive early stages.
- Users can skip a flaky stage (LLM correction) and keep the raw transcript.
- `GetActiveAsync` excludes Paused jobs (they are not actively processing).
- The Quartz job fires on Paused status and skips immediately (guarded by the
  existing terminal+Paused early-exit in `ProcessJobAsync`).
- Schema change requires dropping/recreating the local `mozgoslav.db` for existing
  dev installations (EnsureCreated pattern; migration applied automatically via
  `DatabaseInitializer.MigrateAsync`).
