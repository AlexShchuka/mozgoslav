---
adr: 018
title: Async recording stop with progress visibility
status: Proposed
date: 2026-04-19
priority: mid
related: [ADR-002, ADR-011, ADR-015, ADR-016]
authors: [rybalchenko]
machine_readable: true
---

# ADR-018 — Async recording stop with progress visibility

## 1. GOAL

Replace the current synchronous `Dashboard.stopRecording` flow (UI blocks until
backend finishes upload + import) with an asynchronous flow where:

- UI returns to `idle` ≤300 ms after the user clicks Stop.
- Every active backend `ProcessingJob` is visible in a global tracker with phase
  + progress + cancel/retry affordances.
- Per-recording inline progress is shown in `HomeList` / `RecordingList`.
- Terminal job transitions surface as toasts with a CTA (open note / retry).

## 2. NON-GOALS

- N1. Changing the push-to-talk dictation flow. It stays synchronous (text
  injected at cursor — user is intentionally waiting).
- N2. Changing `IJobProgressNotifier`, `JobSsePayload`, the SSE endpoint, the
  `ProcessQueueWorker` pipeline, or the cancellation contract (ADR-015).
- N3. Adding a new SSE/WebSocket transport. We use the existing
  `GET /api/jobs/stream`.
- N4. Onboarding tutorial / coach-marks beyond a single optional first-run
  toast (defaulted OFF per OQ-1).
- N5. Optimistic `HomeList` row before `/upload` returns (defaulted OFF per
  OQ-2).
- N6. Virtualisation in the tracker (only matters at 10+ concurrent jobs;
  realistic load is 1-3).
- N7. Migrating `/api/devices/stream` and `/api/hotkey/stream` consumers from
  Dashboard inline `EventSource` to slices/sagas. Out of scope; future ADR.

## 3. OPEN QUESTIONS — DEFAULTS LOCKED

| ID | Question | Default | Rationale |
|----|----------|---------|-----------|
| OQ-1 | First-run onboarding toast on Stop | **NO** | Tracker is always visible; revisit only if usability testing flags it. |
| OQ-2 | Optimistic empty row in `HomeList` between Stop and `/upload` response | **NO** | Adds reducer state + edge cases for ~2-sec gap; cheaper to ship without and revisit if perceived as a "drop". |
| OQ-3 | Failed-job retry button | **YES, in S5** | Without retry, the Failed status surface is dead UX. Triggers existing `POST /api/recordings/{id}/reprocess`. |

## 4. CONTEXT (current state, verified)

### 4.1 Frontend

File: `frontend/src/features/Dashboard/Dashboard.tsx:179-220`. Sequential `await`s:

```
recorder.stop()                    // ms
→ await dictationApi.stop()        // O(audio length / RT-factor) — seconds
→ await recordingApi.upload()      // upload + ImportRecordingUseCase — ~sec
→ setRecordState("idle")
```

UI shows `isLoading` for the full duration. After idle, no signal about the
heavy queued pipeline that follows (Whisper.net full pass → glossary →
LLM-correct → summarize → export → RAG-index).

No frontend code subscribes to `/api/jobs/stream`. No store slice exists for
jobs. `JobsApi` only exposes `list`, `listActive`, `cancel`.

### 4.2 Backend (already in place)

| Component | Status |
|-----------|--------|
| `ProcessingJob.{Status, Progress, CurrentStep, ErrorMessage, ...}` | ready |
| `ProcessQueueWorker.RunPipelineAsync` publishes via `IJobProgressNotifier` at every phase (`Transcribing 0→50` with sub-progress, `Correcting 60`, `LLM 70`, `Summarizing 85`, `Exporting 100`) | ready |
| `IJobProgressNotifier` (`ChannelJobProgressNotifier`) fan-out | ready |
| `GET /api/jobs/stream` SSE, `eventType: "job"`, `JobSsePayload {id, recordingId, profileId, status (string), progress (int), currentStep (string?), errorMessage (string?), startedAt (DateTime?), finishedAt (DateTime?)}` | ready |
| `POST /api/queue/{id}/cancel` (ADR-015) | ready |
| `POST /api/recordings/{id}/reprocess` (used for retry) | ready |

## 5. DECISION (architecture)

### 5.1 Flow after change

```
recorder.stop() + final chunks pushed
→ dispatch(stopAndUploadRecording({sessionId, file}))   // returns immediately
→ setRecordState("idle")                                // ≤300 ms total
   (saga in background:
      dispatch(pendingJobCreated({tempId, kind: "uploading"}))
      yield dictationApi.stop  (fire-and-forget; failure logged, not blocking)
      yield recordingApi.upload([file]) → recordings[]
      dispatch(pendingJobResolved({tempId, recordingId}))
      // real ProcessingJob arrives via SSE within 1-2 sec
   )
```

### 5.2 Components delta

| Layer | Add | Edit | Remove |
|-------|-----|------|--------|
| `src/api/JobsApi.ts` | `subscribeActive(onEvent: (j: ProcessingJob) => void): { close(): void }` | — | — |
| `src/store/slices/jobs/` | full new slice (actions, mutations, reducer, selectors, saga) | — | — |
| `src/store/rootReducer.ts` | — | wire `jobs` slice | — |
| `src/store/rootSaga.ts` | — | spawn `subscribeJobsSaga` | — |
| `src/components/ActiveJobsTracker/` | new shared component (presentational + container) | — | — |
| `src/components/Layout/` | — | mount `<ActiveJobsTracker/>` | — |
| `src/features/Dashboard/Dashboard.tsx` | — | drop inline `await dictationApi.stop` + `await recordingApi.upload` from "Записать" branch only; dispatch saga; remove `transcript` state | inline-`transcript` block |
| `src/features/Home/HomeList.tsx` (and any list rendering recordings) | — | per-row inline `<ProgressBar/>` + status badge for active jobs | — |
| `src/locales/{ru,en}.json` | new keys (see §7.4) | — | — |

### 5.3 Backend delta

**Zero required.** Optional (not in this ADR's scope, defer to ADR-014 if
desired): add `JobStatus.Importing` for the gap between `Queued` and
`Transcribing`. Not blocking.

## 6. CONTRACTS

### 6.1 New action types (`slices/jobs/actions.ts`)

```ts
SUBSCRIBE_JOBS                             // dispatched once on app mount
JOBS_SEEDED                                // payload: ProcessingJob[]
JOB_UPDATED                                // payload: ProcessingJob
PENDING_JOB_CREATED                        // payload: { tempId, kind, label }
PENDING_JOB_RESOLVED                       // payload: { tempId, recordingId? }
PENDING_JOB_FAILED                         // payload: { tempId, error }
CANCEL_JOB                                 // payload: { jobId }
RETRY_RECORDING                            // payload: { recordingId }
STOP_AND_UPLOAD_RECORDING                  // payload: { sessionId, file }
```

### 6.2 Reducer state (`slices/jobs/reducer.ts`)

```ts
interface JobsState {
  byId: Record<string, ProcessingJob>;     // real backend jobs, keyed by jobId
  pending: Record<string, PendingJob>;     // pre-queue uploads, keyed by tempId
  isStreaming: boolean;
  lastError?: string;
}

interface PendingJob {
  tempId: string;                          // uuid (client)
  kind: "uploading";
  label: string;                           // i18n string (display only)
  startedAt: string;                       // ISO timestamp
  recordingId?: string;                    // set when /upload returns
}
```

### 6.3 Selectors (`slices/jobs/selectors.ts`)

```ts
getJobById(state, jobId): ProcessingJob | undefined
getJobByRecordingId(state, recordingId): ProcessingJob | undefined
getActiveJobs(state): (ProcessingJob | PendingJob)[]   // status not in {Done, Failed, Cancelled}
getJobsForRecording(state, recordingId): ProcessingJob[]
```

All multi-result selectors memoized via reselect.

### 6.4 EventSource wiring (`subscribeJobsSaga`)

```ts
function createJobsChannel(): EventChannel<ProcessingJob> {
  return eventChannel((emit) => {
    const es = new EventSource(`${BACKEND_URL}/api/jobs/stream`);
    es.addEventListener("job", (e) => {
      try { emit(JSON.parse((e as MessageEvent).data) as ProcessingJob); } catch {}
    });
    return () => es.close();
  });
}

function* subscribeJobsSaga() {
  try {
    const seed: ProcessingJob[] = yield call([jobsApi, jobsApi.listActive]);
    yield put(jobsSeeded(seed));
  } catch (err) { /* swallow — EventSource will repopulate */ }

  const channel = yield call(createJobsChannel);
  try {
    while (true) {
      const job = yield take(channel);
      yield put(jobUpdated(job));
    }
  } finally { channel.close(); }
}
```

## 7. STAGES — ALL MERGEABLE INDEPENDENTLY (in order)

Each stage = one branch from `main`, one MR ≤200 LOC of meaningful code (not
counting tests). Each MR cross-references this ADR in its description.

### 7.1 S1 — Frontend store: jobs slice

Branch: `rybalchenko/adr-018-s1-jobs-slice-2026-04-19`.

Files added:
- `src/api/JobsApi.ts` (+ `subscribeActive`)
- `src/store/slices/jobs/actions.ts`
- `src/store/slices/jobs/mutations.ts`
- `src/store/slices/jobs/reducer.ts`
- `src/store/slices/jobs/selectors.ts`
- `src/store/slices/jobs/saga/subscribeJobsSaga.ts`
- `src/store/slices/jobs/saga/cancelJobSaga.ts`
- `src/store/slices/jobs/saga/retryRecordingSaga.ts`
- `src/store/slices/jobs/types.ts`
- `src/store/slices/jobs/index.ts`
- `src/store/slices/jobs/__tests__/reducer.test.ts`
- `src/store/slices/jobs/__tests__/selectors.test.ts`
- `src/store/slices/jobs/__tests__/saga.test.ts`

Files edited:
- `src/store/rootReducer.ts`
- `src/store/rootSaga.ts`
- `src/constants/api.ts` (if `jobsStream` endpoint constant is missing)
- `src/domain/ProcessingJob.ts` (if missing fields vs `JobSsePayload`)

Acceptance:
- [ ] `npm run typecheck` — green.
- [ ] `npm test src/store/slices/jobs` — green; reducer covers JOB_UPDATED, PENDING_*; saga test covers SEED + CHANNEL_EMIT.
- [ ] `npm run lint` — green.
- [ ] Manual: open app, no UI changes yet, `getState().jobs.isStreaming === true`, real jobs flow into `byId` (visible in Redux DevTools).

### 7.2 S2 — `<ActiveJobsTracker/>` shared component + Layout mount

Branch: `rybalchenko/adr-018-s2-active-jobs-tracker-2026-04-19`.

Files added:
- `src/components/ActiveJobsTracker/ActiveJobsTracker.tsx`
- `src/components/ActiveJobsTracker/ActiveJobsTracker.container.ts`
- `src/components/ActiveJobsTracker/ActiveJobsTracker.style.ts`
- `src/components/ActiveJobsTracker/types.ts`
- `src/components/ActiveJobsTracker/index.ts`
- `src/components/ActiveJobsTracker/__tests__/ActiveJobsTracker.test.tsx`

Files edited:
- `src/components/Layout/*` — mount tracker (sticky bottom-right, z-index above modals' dim layer but below toasts).
- `src/locales/{ru,en}.json` — keys §7.4.

Acceptance:
- [ ] Tracker renders current `getActiveJobs()` list with phase + ProgressBar.
- [ ] Cancel button dispatches `CANCEL_JOB`, calls `JobsApi.cancel(id)`, status updates via SSE within 2 s.
- [ ] Empty state hidden (no chip when 0 active).
- [ ] All copy in both locales.
- [ ] Component test with mock store covers: 0 jobs (hidden), N>0 (visible), cancel click.

### 7.3 S3 — Refactor `Dashboard.stopRecording` → saga

Branch: `rybalchenko/adr-018-s3-stop-saga-2026-04-19`.

Files added:
- `src/store/slices/jobs/saga/stopAndUploadRecordingSaga.ts`
- `src/store/slices/jobs/__tests__/stopAndUploadSaga.test.ts`

Files edited:
- `src/features/Dashboard/Dashboard.tsx` — for the "Записать" path (`persistOnStop: true`):
  - Replace inline `await dictationApi.stop + await recordingApi.upload` with `dispatch(stopAndUploadRecording({ sessionId, file }))`.
  - `setRecordState("idle")` immediately after `recorder.stop()` + `await stopped`.
  - Remove `transcript` state and the inline transcript display block.
- `src/features/Dashboard/__tests__/Dashboard.test.tsx` — update; assert state→idle within event loop tick after Stop.

Acceptance:
- [ ] Stop click → `recordState === "idle"` synchronously after recorder onstop.
- [ ] Pending-job appears in tracker (`PENDING_JOB_CREATED` → `getActiveJobs()` includes it).
- [ ] On `/upload` success, pending-job is replaced by real `ProcessingJob` once SSE delivers it.
- [ ] On `/upload` failure, toast error; pending-job removed.
- [ ] Push-to-talk path (`persistOnStop: false`) untouched — regression test passes.

### 7.4 S4 — Inline progress on recording cards

Branch: `rybalchenko/adr-018-s4-inline-progress-2026-04-19`.

Files added:
- (likely no new files; inline within existing card components)

Files edited:
- `src/features/Home/HomeList.tsx` — add `getJobByRecordingId(state, recording.id)` lookup; render badge + thin `<ProgressBar/>` if active.
- `src/features/RecordingList/RecordingList.tsx` — same.
- `src/locales/{ru,en}.json` — phase labels.

Acceptance:
- [ ] Active recording shows phase badge + progress bar inline.
- [ ] `Done` recording shows normal card (no bar).
- [ ] `Failed` recording shows red badge with error tooltip.
- [ ] No re-render storm — selector memoized.

### 7.5 S5 — Toasts on terminal transitions + retry

Branch: `rybalchenko/adr-018-s5-terminal-toasts-2026-04-19`.

Files added:
- (within `subscribeJobsSaga` extension)

Files edited:
- `src/store/slices/jobs/saga/subscribeJobsSaga.ts` — diff `prev` vs `incoming` status; on transitions Queued/*→Done|Failed|Cancelled emit toast via `react-toastify` directly, with appropriate CTA (open note / retry).
- `src/components/ActiveJobsTracker/ActiveJobsTracker.tsx` — Failed entries get retry button.
- `src/store/slices/jobs/saga/retryRecordingSaga.ts` — call `POST /api/recordings/{id}/reprocess`.
- `src/locales/{ru,en}.json` — keys.

Acceptance:
- [ ] Done → toast with "open note" link working.
- [ ] Failed → toast + retry button, retry triggers reprocess endpoint and a new job appears in tracker.
- [ ] Cancelled → silent toast (info-level, no CTA).

### 7.6 i18n keys (added across stages)

```
jobs.tracker.title
jobs.tracker.empty                   ; rendered hidden by container, but key exists
jobs.tracker.cancel
jobs.tracker.retry
jobs.tracker.openNote
jobs.status.uploading
jobs.status.queued
jobs.status.transcribing
jobs.status.correcting
jobs.status.summarizing
jobs.status.exporting
jobs.status.done
jobs.status.failed
jobs.status.cancelled
jobs.toast.done
jobs.toast.failed
jobs.toast.cancelled
jobs.toast.openNote
```

## 8. TEST STRATEGY

| Layer | Tool | Coverage |
|-------|------|----------|
| reducer | Jest + RTL | every action → state transition |
| selectors | Jest | `getActiveJobs` filters correctly across all `JobStatus`; reselect memoization (same input → same reference) |
| saga | `redux-saga-test-plan` | `subscribeJobsSaga` seeds + reacts to channel emits; `cancelJobSaga` calls API + does NOT re-dispatch (SSE delivers update); `retryRecordingSaga` calls reprocess; `stopAndUploadRecordingSaga` happy path + failure path |
| component | Jest + RTL + mock store | `ActiveJobsTracker` 0/N/cancel/retry; `Dashboard` Stop → idle within tick |
| integration | existing C# `ApiEndpointsTests`, `RecordingUploadEndpointTests` | unchanged contract → must still pass |

No new backend tests required (no backend changes).

## 9. ALTERNATIVES (rejected)

| ID | Option | Why rejected |
|----|--------|--------------|
| A1 | Inline `EventSource` in Dashboard, no slice | Cross-page state lost on navigation; tracker must live in Layout. |
| A2 | Polling `JobsApi.list` every 2 s | SSE infra exists; polling is downgrade (latency, load). |
| A3 | WebSocket | No bidirectional need; SSE simpler; native EventSource. |
| A4 | Fire-and-forget upload (no tracking) | Silent data loss risk; user wants visibility. |
| A5 | Make `dictationApi.stop` background but keep `await recordingApi.upload` | Half-async UX; same wait. |

## 10. CONSEQUENCES

**Positive:**
- Stop → idle instantly. User unblocked.
- Active backlog visible. ADR-015 cancel finally has UI.
- Canonical SSE-via-saga pattern established; future migrations of devices/hotkey streams reuse it.

**Negative:**
- New slice + sagas + component + tests. M-sized work (3-4 days).
- Behaviour change: existing users lose the inline transcript preview on the Dashboard Stop path (push-to-talk path keeps it). Acceptable — heavy pipeline produces the canonical transcript anyway.
- More edge cases in reducer (pending lifecycle).

**Unchanged:**
- Domain model, backend pipeline, push-to-talk flow, persisted notes / transcripts / RAG.

## 11. DEFINITION OF DONE (for the whole ADR)

- [ ] Stop button returns to idle ≤300 ms regardless of recording length.
- [ ] `<ActiveJobsTracker/>` is mounted in `Layout`, always rendered, hidden when 0 active jobs, visible otherwise.
- [ ] Tracker reflects state seeded from `JobsApi.listActive()` on mount AND from all subsequent `/api/jobs/stream` events.
- [ ] Cancel from tracker → backend cancel → SSE update → UI reflects within 2 s.
- [ ] `Done` toast contains a working link to the produced note.
- [ ] `Failed` shows error message + retry; retry triggers `POST /api/recordings/{id}/reprocess` and new job appears in tracker.
- [ ] All new i18n keys exist in `ru.json` AND `en.json`. Missing-key fallback verified.
- [ ] All new code passes `npm run typecheck && npm run lint && npm test`.
- [ ] Push-to-talk path explicitly regression-tested (synchronous, transcript display preserved).
- [ ] Existing backend tests (`ApiEndpointsTests`, `RecordingUploadEndpointTests`) unchanged and green.

## 12. ESTIMATE

M — 3-4 engineering days end-to-end (no review buffer). One MR per stage, each ≤200 LOC of source + matching tests.
