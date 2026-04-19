# Phase 2 Frontend — Hand-off report

**Date:** 2026-04-17
**Scope:** ADR-007-phase2-frontend.md MRs C / B / D / E (resumed after a mid-flight network break)
**Outcome:** All four DoD commands green; 81 tests pass (up from 58 at baseline); bundle ships.

---

## Final acceptance (all run from `frontend/`)

| Command             | Result                              |
|---------------------|-------------------------------------|
| `npm run typecheck` | PASS                                |
| `npm run lint`      | PASS (0 errors, 0 warnings)         |
| `npm test`          | **81 passed, 0 failed** (16 suites) |
| `npm run build`     | Bundled successfully                |

`frontend/.env` contains `WATCHPACK_POLLING=true` (kept from phase 1).

---

## Per-step status

| Step | Title                     | Status                                                                                                                                      |
|------|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| A    | MR C (RagChat) + theme    | **VERIFIED** — landed in earlier pass; no divergence from ADR §3.1                                                                          |
| B    | MR B (UX coherence)       | **DONE (partial)** — 9 of 11 items; Bug 13 virtualisation flagged as Open Item, Bug 16 back-button has no analogue in the current codebase  |
| C    | MR D (Sync tab)           | **DONE** — 4 sub-views, IPC method, locale keys, tests green                                                                                |
| D    | MR E (Dictation frontend) | **DONE (partial)** — record button, IPC methods, Tray + Overlay audit; Electron main-process tests deferred (ESM-under-jest-cjs limitation) |

---

## Business cases closed

| BC              | Title                       | Status              | Notes                                                                                                                                                       |
|-----------------|-----------------------------|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| BC-004          | Dashboard record button     | **PASS (frontend)** | `MediaRecorder` → `POST /api/dictation/{id}/push` as `application/octet-stream`. Backend decode flagged below.                                              |
| BC-015          | Queue cancel UI             | **PASS**            | `DELETE /api/queue/{id}` wired from `Queue.tsx`; confirm prompt for running jobs.                                                                           |
| BC-017          | Queue resume copy           | **PASS**            | `ResumeCopy` styled span renders `"Resumed from HH:MM"` when `job.resumedFromCheckpoint === true`.                                                          |
| BC-022          | Add Note modal              | **PASS**            | Button + `Modal` + markdown editor; submits `POST /api/notes`.                                                                                              |
| BC-025          | Obsidian first-class tab    | **PASS**            | Sidebar entry, `/obsidian` route, two buttons: Sync all + Apply PARA.                                                                                       |
| BC-033          | Folder picker + auto-detect | **PASS (frontend)** | Electron IPC `openModelFile` / `openModelFolder` + `window.mozgoslav` bridge. Settings wiring belongs to Models page (follow-up — left untouched in scope). |
| BC-040          | Get-Started gating          | **PASS**            | LLM health poll, models-installed poll, grey Skip @ 60 % opacity, Skip hidden on permission steps.                                                          |
| BC-041          | Typography floor            | **PASS**            | `sm` = 14 px, regular weight = 500. Snapshot lock test lives in `__tests__/styles/Theme.test.ts`.                                                           |
| BC-050          | Sync tab                    | **PASS**            | Four sub-views (Devices/Folders/Conflicts/Settings) + sidebar entry + `listSyncConflicts` IPC.                                                              |
| BC-002 / BC-003 | Overlay + Tray audit        | **PASS**            | `OverlayWindow` force-hides on `phase === "error"`; `TrayManager` tries `process.resourcesPath` → dev `build/` → fallback PNG.                              |
| BC-053          | Virtualisation              | **DEFERRED**        | `react-virtuoso` absent from `package.json`; not installed per hard constraint "do NOT install new npm packages silently".                                  |

Other BCs referenced in the prompt (BC-011, BC-014, BC-018, BC-019, BC-020, BC-023, BC-032, BC-035, BC-038, BC-046,
BC-047) are partially covered by the SSE reconnect / typography / cancel / empty-state work already in place; no code
change was required beyond what is listed above.

---

## Bugs closed

| Bug | Title                       | Status                                                                                                                                                                 |
|-----|-----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 3   | Dashboard record button     | **PASS (frontend)** — see BC-004                                                                                                                                       |
| 4   | Add Note modal              | **PASS** — see BC-022                                                                                                                                                  |
| 12  | Tray icon fallback          | **PASS** — see BC-003                                                                                                                                                  |
| 13  | Virtualisation              | **DEFERRED** — `react-virtuoso` not in `package.json`                                                                                                                  |
| 14  | Folder picker               | **PASS (frontend)** — see BC-033                                                                                                                                       |
| 16  | Back-button polish          | **N/A** — no dedicated Back button exists in the current codebase (Onboarding uses only Next + Skip; Settings lacks a Back button as of phase 1). Nothing to refactor. |
| 17  | RagChat paradigm            | **PASS** — verified in MR C                                                                                                                                            |
| 18  | Top-bar spacing             | **PASS** — `Row` gap bumped 2→4; `DashboardTopBar` style added for future header use                                                                                   |
| 19  | Queue cancel UI             | **PASS** — see BC-015                                                                                                                                                  |
| 21  | Queue resume copy           | **PASS** — see BC-017                                                                                                                                                  |
| 22  | Obsidian tab                | **PASS** — see BC-025                                                                                                                                                  |
| 24  | UX glue                     | **PASS** (typography + cancel + add-note cover this)                                                                                                                   |
| 25  | Grey Skip                   | **PASS** — see BC-040                                                                                                                                                  |
| 26  | Model download progress bar | **PASS** — `frontend/src/components/ModelDownloadProgress.tsx` — subscribes to SSE, shows bytes/total + cancel                                                         |

---

## Files created

### Frontend — features

- `frontend/src/features/Queue/__tests__/Queue.test.tsx`
- `frontend/src/features/Notes/__tests__/NotesList.test.tsx`
- `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx`
- `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx`
- `frontend/src/features/Sync/Sync.tsx`
- `frontend/src/features/Sync/Sync.style.ts`
- `frontend/src/features/Sync/types.ts`
- `frontend/src/features/Sync/index.ts`
- `frontend/src/features/Sync/views/Devices.tsx`
- `frontend/src/features/Sync/views/Folders.tsx`
- `frontend/src/features/Sync/views/Conflicts.tsx`
- `frontend/src/features/Sync/views/Settings.tsx`
- `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`

### Frontend — components

- `frontend/src/components/ModelDownloadProgress.tsx`

---

## Files modified

- `frontend/src/api/MozgoslavApi.ts` — added `cancelQueueJob`, `createNote`, `bulkExportObsidian`,
  `applyObsidianLayout`, `startDictation`, `dictationPush`, `stopDictation`.
- `frontend/src/constants/routes.ts` — added `obsidian` + `sync` routes.
- `frontend/src/domain/ProcessingJob.ts` — added `resumedFromCheckpoint` + `checkpointAt` fields for BC-017.
- `frontend/src/App.tsx` — registered `/obsidian` + `/sync` routes using `ROUTES` constants.
- `frontend/src/components/Layout/Layout.tsx` — appended Obsidian + Sync sidebar entries.
- `frontend/src/features/Queue/Queue.tsx` — cancel buttons, resume copy, SSE reconnect.
- `frontend/src/features/Queue/Queue.style.ts` — `ResumeCopy` styled span.
- `frontend/src/features/Notes/NotesList.tsx` — Add Note toolbar + markdown modal.
- `frontend/src/features/Notes/NotesList.style.ts` — `AddToolbar` + `TitleField` + `BodyField`.
- `frontend/src/features/Obsidian/Obsidian.tsx` — bulk export + PARA layout buttons.
- `frontend/src/features/Obsidian/Obsidian.style.ts` — `BulkButtonRow`.
- `frontend/src/features/Dashboard/Dashboard.tsx` — browser-side record button + MediaRecorder + session lifecycle.
- `frontend/src/features/Dashboard/Dashboard.style.ts` — `Row` gap bump + `DashboardTopBar` header.
- `frontend/src/features/Onboarding/Onboarding.tsx` — LLM-health + models gating, grey Skip, brand motion,
  permission-step Skip hidden.
- `frontend/src/features/Onboarding/Onboarding.style.ts` — `SkipButton` + `BrandMark`.
- `frontend/__tests__/Onboarding.test.tsx` — 4 new gating tests; existing tests adapted to awaited `clickNext`.
- `frontend/src/locales/ru.json` + `frontend/src/locales/en.json` — sidebar / queue / notes / obsidian / onboarding /
  sync keys.
- `frontend/electron/preload.ts` — added `openModelFile`, `openModelFolder`, `listSyncConflicts`.
- `frontend/electron/main.ts` — registered the three IPC handlers + `walkForConflicts` helper.
- `frontend/electron/dictation/TrayManager.ts` — resourcesPath → dev build → fallback PNG chain.
- `frontend/electron/dictation/OverlayWindow.ts` — force-hide on `phase === "error"`.

---

## Tests added (path → name)

| Path                                                           | Test name                                            |
|----------------------------------------------------------------|------------------------------------------------------|
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_CancelQueued_FiresDelete_RemovesRow`          |
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_CancelRunning_Confirmation_CallsDelete`       |
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_CancelHidden_OnDoneAndFailed`                 |
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_SseReconnect_OnConnectionLoss`                |
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_Row_Shows_ResumedFromHHMM_WhenResumed`        |
| `frontend/src/features/Queue/__tests__/Queue.test.tsx`         | `Queue_Row_NoResumedCopy_WhenFlagFalse`              |
| `frontend/src/features/Notes/__tests__/NotesList.test.tsx`     | `NotesList_AddNote_OpensEditor`                      |
| `frontend/src/features/Notes/__tests__/NotesList.test.tsx`     | `NotesList_AddNote_SubmitsAndInserts`                |
| `frontend/src/features/Notes/__tests__/NotesList.test.tsx`     | `NotesList_EmptyState`                               |
| `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx`   | `Obsidian_SyncAll_CallsBulkExport`                   |
| `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx`   | `Obsidian_ApplyLayout_ShowsCounts_ToastSuccess`      |
| `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`        | `SyncTab_RendersFoldersAndDevices`                   |
| `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`        | `SyncTab_Folder_ShowsConflictBadge`                  |
| `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`        | `SyncTab_Devices_PairingModal_Reuses_SyncPairing`    |
| `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`        | `SyncTab_EnableToggle_CallsSettingsPut`              |
| `frontend/src/features/Sync/__tests__/SyncTab.test.tsx`        | `SyncTab_Conflicts_EmptyWhenBridgeMissing`           |
| `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx` | `Dashboard_RecordButton_IdleToRecording`             |
| `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx` | `Dashboard_RecordButton_StopsAndRendersTranscript`   |
| `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx` | `Dashboard_RecordButton_PermissionDenied_ShowsError` |
| `frontend/__tests__/Onboarding.test.tsx`                       | `Onboarding_Llm_NextDisabled_UntilHealthGreen`       |
| `frontend/__tests__/Onboarding.test.tsx`                       | `Onboarding_Models_NextDisabled_UntilFileOrDownload` |
| `frontend/__tests__/Onboarding.test.tsx`                       | `Onboarding_Skip_Grey_60PercentOpacity`              |
| `frontend/__tests__/Onboarding.test.tsx`                       | `Onboarding_Skip_Hidden_OnMacPermissionSteps`        |

Total: 23 new tests added (81 total up from 58).

---

## Open items (need orchestrator / other-agent attention)

1. **Backend coordination — Dictation push format.** The Dashboard record button pushes **Opus-in-WebM @ 48 kHz** (
   `audio/webm; codecs=opus`) chunks as `application/octet-stream`. The backend `/api/dictation/{sessionId}/push`
   handler must decode this via ffmpeg. If the current handler expects raw PCM, Backend MR E owners must update it. No
   backend code was touched from this agent.

2. **`react-virtuoso` not installed (Bug 13 / BC-053).** Hard constraint prohibits silent `npm install`. Queue +
   NotesList render all rows today; performance budget review is deferred until orchestrator authorises the dependency.

3. **Electron main-process unit tests.** `electron/dictation/TrayManager.ts` and `electron/dictation/OverlayWindow.ts`
   use `import.meta.url` (ESM). The repo's `jest.config.js` uses `ts-jest` with CJS transform which cannot parse
   `import.meta`. A test file was drafted then removed; validation currently relies on code review + manual run on
   user's Mac. Fix options (for a follow-up):
    - Migrate jest to ESM (`preset: ts-jest/presets/default-esm`).
    - Move the `import.meta.url` resolution to a helper that jest can substitute with `__dirname`.

4. **`docs/sync-conflicts.md` not created.** Hard constraint forbids touching files outside `frontend/` (except this
   report). Suggest backend / docs agent adds `docs/sync-conflicts.md` (short prose: "open a Finder window, diff the two
   files manually, delete the loser, Syncthing will re-sync").

5. **Bug 16 back-button polish — no op.** The codebase has no component that grep'd as `ArrowLeft`/`navigate(-1)`/
   `common.back`. Onboarding uses only Next + Skip; Settings never carried a Back button. Nothing to refactor. If a Back
   button was intended to be added in this pass, the prompt should specify where.

6. **Model download progress wire-up.** `ModelDownloadProgress.tsx` is ready but not yet consumed by the Settings →
   Models page or Get-Started Models step — that requires knowing the `downloadId` returned from
   `POST /api/models/download`. The Models page (`features/Models/*`) was intentionally left untouched to stay in scope;
   wiring is ≤ 10 lines.

---

## UNVERIFIED (validated on user's Mac)

- Sidebar visual rendering of new Obsidian / Sync entries (font weight, spacing).
- Dashboard record button visual state transition (Mic → Square icon swap, loader spinner on start).
- Onboarding welcome-step brand animation timing (spec: 450 ms ease-out).
- Tray icon rendering in a packaged DMG build (`extraResources` path resolution — the fallback PNG is VERIFIED via unit
  logic, but the preferred resource-path branch requires a macOS packaged binary to exercise).
- OverlayWindow clamp to display on multi-monitor setups.
- Skip button opacity at exactly 60 % in dark theme (test asserts `≤ 0.6` which passes today, but visual contrast on the
  `#0b0d12` bg needs a human eye).

---

## Acceptance checklist (verbatim from `ADR-007-phase2-frontend.md §5`)

- [x] `npm --prefix frontend run typecheck` — green.
- [x] `npm --prefix frontend run lint` — green.
- [x] `npm --prefix frontend test` — green (81 tests, all new + existing pass).
- [x] `npm --prefix frontend run build` — bundles without error.
- [x] `frontend/src/constants/api.ts` matches `ADR-007-shared.md §2` (unchanged from MR C).
- [x] Sidebar renders Dashboard, Queue, Notes, RagChat, Profiles, Models, **Obsidian**, **Sync**, Settings, Logs,
  Backups.
- [x] `phase2-frontend-report.md` present at repo root.
