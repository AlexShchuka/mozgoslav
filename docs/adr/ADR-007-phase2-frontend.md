# ADR-007 — Phase 2 Frontend Agent

Read first: `ADR-007.md`, `ADR-007-shared.md` (API contract §2 is your binding target), `frontend/CLAUDE.md`, root `CLAUDE.md`. Precondition: **Phase 1 Agent A acceptance passed**.

Frontend agent owns React + Redux + Electron main-process code for MRs C / B / D / E. Runs parallel to Backend, Python, Swift agents. Works in `frontend/` only.

---

## 0. Goal and definition of done

**Goal.** Every frontend BC owned by Phase 2 passes its test green; every frontend bug in ADR-007 §5 is closed; the app renders all Iteration-7 surfaces against the fixed API contract; Electron main (tray, overlay, IPC) is coherent.

**DoD commands.**

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav/frontend
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

All zero-error, all tests green. Dev-time visual verification happens on the user's Mac; sandbox check is type + lint + jest + bundle.

**Pod-specific.** `frontend/.env` must contain `WATCHPACK_POLLING=true` for any `npm run dev` session (Kubernetes pod inotify limits).

---

## 1. Scope

| MR | Order | BCs | Bugs | Main deliverables |
|----|-------|-----|------|-------------------|
| **C** (RagChat) | 1st | BC-039 (frontend) | 5, 17 | Restore `frontend/src/features/RagChat/*` as full-page single-surface chat. New route. New saga slice. Remove pre-`81afb1d` bubbles + Ask-button paradigm. |
| **B** (UX coherence) | 2nd | BC-004 (button stays responsive while backend wires in MR E), BC-011, BC-014, BC-015 (cancel UI), BC-018, BC-019, BC-020, BC-022 (frontend), BC-023, BC-025 (frontend), BC-032, BC-035, BC-038, BC-040, BC-041, BC-046, BC-047, BC-053 | 4, 13, 16, 18, 19, 21 (UI), 22 (UI), 24, 25, 26 (frontend) | Typography bump, back-button polish, queue cancel affordance, Get-Started gating + subtle Skip, download progress bar, Obsidian first-class tab, Add Note modal, virtualisation. |
| **D** (Sync tab) | 3rd | BC-050 | 23 (frontend) | `frontend/src/features/Sync/*` first-class tab. Devices / Folders / Conflicts / Settings sub-views. Reuse `SyncPairing` as pairing-modal. |
| **E** (Dictation frontend) | 4th | BC-002, BC-003, BC-004 (push audio), BC-033 (frontend), BC-040 mic/AX/InputMonitoring checks | 3, 12, 14 (frontend) | Dashboard browser-side audio push via MediaRecorder; folder-pick + auto-detect for `.bin/.gguf`; tray-icon + overlay fixes; onboarding permissions gating. |

BC text is authoritative in `ADR-007.md §4`. API endpoints and payloads are authoritative in `ADR-007-shared.md §2`.

---

## 2. Pre-flight

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav/frontend

# Ensure the polling watcher is active in the pod.
grep -q "^WATCHPACK_POLLING=true" .env || echo "WATCHPACK_POLLING=true" >> .env

npm install

# Baseline — everything green before you start (frontend is untouched in Phase 1).
npm run typecheck
npm run lint
npm test
```

**Constants alignment.** Update `frontend/src/constants/api.ts` once with every endpoint in `ADR-007-shared.md §2`. You write this file first; every feature imports from it. Shape:

```ts
export const API = {
    health:            "/api/health",
    healthLlm:         "/api/health/llm",
    recordings:        "/api/recordings",
    recording:  (id: string) => `/api/recordings/${id}`,
    importRecordings:  "/api/recordings/import",
    uploadRecordings:  "/api/recordings/upload",
    reprocess:  (id: string) => `/api/recordings/${id}/reprocess`,
    jobs:              "/api/jobs",
    jobsActive:        "/api/jobs/active",
    jobsStream:        "/api/jobs/stream",
    enqueueJob:        "/api/jobs",
    queueCancel:(id: string) => `/api/queue/${id}`,
    notes:             "/api/notes",
    note:       (id: string) => `/api/notes/${id}`,
    exportNote: (id: string) => `/api/notes/${id}/export`,
    profiles:          "/api/profiles",
    profile:    (id: string) => `/api/profiles/${id}`,
    duplicateProfile: (id: string) => `/api/profiles/${id}/duplicate`,
    settings:          "/api/settings",
    models:            "/api/models",
    modelsDownload:    "/api/models/download",
    modelsDownloadStream: "/api/models/download/stream",
    modelsScan: (dir: string) => `/api/models/scan?dir=${encodeURIComponent(dir)}`,
    meetilyImport:     "/api/meetily/import",
    obsidianSetup:     "/api/obsidian/setup",
    obsidianExportAll: "/api/obsidian/export-all",
    obsidianApplyLayout: "/api/obsidian/apply-layout",
    logs:              "/api/logs",
    logsTail:  (file: string | undefined, lines: number) =>
        `/api/logs/tail?${file ? `file=${encodeURIComponent(file)}&` : ""}lines=${lines}`,
    backup:            "/api/backup",
    backupCreate:      "/api/backup/create",
    ragReindex:        "/api/rag/reindex",
    ragQuery:          "/api/rag/query",
    syncStatus:        "/api/sync/status",
    syncHealth:        "/api/sync/health",
    syncPairingPayload:"/api/sync/pairing-payload",
    syncAcceptDevice:  "/api/sync/accept-device",
    syncEvents:        "/api/sync/events",
    dictationStart:    "/api/dictation/start",
    dictationPush: (sessionId: string) => `/api/dictation/${sessionId}/push`,
    dictationStop:(sessionId: string) => `/api/dictation/stop/${sessionId}`,
} as const;
```

---

## 3. Work order

### 3.1 MR C — RagChat

**Preconditions.** Phase 1 complete. Backend MR C may be in-flight; you wire against the API contract.

**Step 1 — Red-first tests.**

```
frontend/src/features/RagChat/__tests__/RagChat.test.tsx
    RagChat_Placeholder_Visible
    RagChat_SubmitQuestion_CallsApi_RendersAnswer
    RagChat_LlmUnreachable_ShowsRawCitations
    RagChat_CitationClick_NavigatesToNote

frontend/src/store/slices/rag/__tests__/saga.test.ts
    askQuestion_PutsAnswerOnSuccess
    askQuestion_PutsFailureOnError_KeepsCitations
```

**Step 2 — Files.**

```
frontend/src/features/RagChat/RagChat.tsx
frontend/src/features/RagChat/RagChat.style.ts
frontend/src/features/RagChat/RagChat.container.ts
frontend/src/features/RagChat/types.ts
frontend/src/store/slices/rag/actionCreator.ts
frontend/src/store/slices/rag/reducer.ts
frontend/src/store/slices/rag/mutations.ts
frontend/src/store/slices/rag/selectors.ts
frontend/src/store/slices/rag/saga/index.ts
frontend/src/store/slices/rag/saga/askQuestion.ts
```

**Step 3 — UX specification (authoritative).**

- **Full-page surface**, not modal. Route: `/rag`. Add to `frontend/src/constants/routes.ts` and `frontend/src/App.tsx`.
- **Single input** at the bottom with placeholder `"Привет, введи сюда…"`. Enter submits; Shift+Enter inserts newline.
- **Message list** stacks top-down. Each message row: `{role, content, citations?, state: "pending" | "done" | "error"}`. User messages right-aligned, assistant left-aligned.
- **Animations.** Subtle enter/exit (300-450 ms ease-out), typing indicator dot-pulse while `state === "pending"`, token fade-in when streamed (if you add streaming, otherwise on final). Use `motion` (already in `frontend/package.json`) with `LazyMotion strict`. No heavy framer wrappers.
- **Citations.** Each renders as a `[Title → §N]` chip; click navigates to `/notes/{noteId}?segment={segmentId}` via `useNavigate`.
- **No bubbles**, no "Ask" button. The old bubble layout is gone.
- **i18n keys** — `rag.placeholder`, `rag.emptyState`, `rag.error`, `rag.citationLink`. Add to `ru.json` + `en.json`.

**Step 4 — Saga.**

```ts
export function* askQuestion(action: ReturnType<typeof actions.askQuestion>) {
    const { question, topK } = action.payload;
    yield put(actions.askPending());
    try {
        const answer: RagAnswer = yield call(api.ragQuery, { question, topK });
        yield put(actions.askSuccess(answer));
    } catch (err) {
        yield put(actions.askFailure((err as Error).message));
    }
}
```

`api.ragQuery` lives in `frontend/src/api/MozgoslavApi.ts`:

```ts
async ragQuery(payload: { question: string; topK?: number }): Promise<RagAnswer> {
    const res = await this.post(API.ragQuery, payload);
    if (!res.ok) throw new Error(`RAG query failed: ${res.status}`);
    return res.json();
}
```

**Step 5 — Verify.** `npm test -- RagChat && npm test -- rag-saga`. Type-check + lint.

---

### 3.2 MR B — UX coherence

**Preconditions.** MR C complete.

**Step 1 — Theme bump (BC-041, Bug 16).**

`frontend/src/styles/theme.ts`:
- `typography.sm.fontSize` → `"14px"` (currently < 14 px).
- Revisit `typography.sm.lineHeight` — snap to 1.5.
- Revisit `typography.bodyWeight`, `buttonWeight`; never below 500 for `variant="primary"` buttons.

Snapshot lock test:
```
frontend/__tests__/styles/Theme.test.ts
    Typography_sm_gte_14px
    Button_primary_weight_gte_500
```

**Step 2 — Top-bar spacing (Bug 18).**

`frontend/src/features/Dashboard/Dashboard.style.ts` — the header grid. Remove overlap between brand block and action buttons. Add `gap: 16px` and `align-items: center`. Visual inspection on user's Mac.

**Step 3 — Back button polish (Bug 16).**

Audit uses of the Back icon in `frontend/src/features/Onboarding/**` + `SettingsNavigation`. Switch to `variant="secondary"` (no bold weight). Replace the current icon with a bolder outline variant from the existing icon set.

**Step 4 — Queue cancel UI (BC-015, Bug 19).**

Backend already ships `DELETE /api/queue/{id}` (Phase 1 verified). Add cancel button in `frontend/src/features/Queue/Queue.tsx` row actions:
- queued job → visible, enabled.
- running job → visible with warning icon, disabled-while-cancelling.
- finished / failed → hidden.

Test:
```
frontend/src/features/Queue/__tests__/Queue.test.tsx
    Queue_CancelQueued_FiresDelete_RemovesRow
    Queue_CancelRunning_Confirmation_CallsDelete
    Queue_SseReconnect_OnConnectionLoss   (BC-014 reconnect edge)
```

**Step 5 — Get-Started gating (BC-040, Bug 25).**

`frontend/src/features/Onboarding/*`. State machine:
- LLM step → Next disabled until `GET /api/health/llm` returns `{reachable:true}` OR user clicks Skip.
- Models step → Next disabled until either (a) folder scan returned ≥1 `.bin`/`.gguf` OR (b) catalogue download completed (subscribe to SSE stream).
- Permissions (macOS native) — handle the actual grant via Swift helper JSON-RPC `permissions.check` every 2 s; step resolves when `mic && ax && inputMonitoring === true` (each permission independently). Skip hidden here (permissions are not optional).
- Skip button — grey, ≤ 60 % opacity of primary CTA, no border.
- Welcome step — brand animation: `motion` / `LazyMotion strict`; a 450 ms subtle enter on the brand wordmark, nothing else.

Tests:
```
frontend/src/features/Onboarding/__tests__/Onboarding.test.tsx
    Onboarding_Llm_NextDisabled_UntilHealthGreen
    Onboarding_Models_NextDisabled_UntilFileOrDownload
    Onboarding_Skip_Grey_60PercentOpacity
    Onboarding_Walkthrough_FinishWritesFlag  (existing — verify)
```

**Step 6 — Model download progress bar (Bug 26).**

Component `frontend/src/components/ModelDownloadProgress.tsx` — subscribes to `GET /api/models/download/stream?downloadId=<id>` (SSE). Renders `ProgressBar` + bytes/totalBytes label + Cancel button (calls `DELETE /api/models/download/{downloadId}` when we add it — for now just hides the component on Cancel click).

Used on:
- Get-Started Models step (when user clicks a catalogue entry and starts download).
- Settings → Models page (same, for post-onboarding downloads).

**Step 7 — Obsidian first-class tab (BC-025, Bug 22).**

`frontend/src/features/Obsidian/Obsidian.tsx` — promoted to a sidebar entry (`frontend/src/components/Layout/Sidebar.tsx`). Two buttons on the page:
- "Sync all un-exported notes now" → `POST /api/obsidian/export-all` → toast with counts.
- "Разложить по PARA" → `POST /api/obsidian/apply-layout` → toast with `{createdFolders, movedNotes}` counts.

Copy keys in `ru.json` + `en.json`.

Test:
```
frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx
    Obsidian_SyncAll_CallsBulkExport
    Obsidian_ApplyLayout_ShowsCounts_ToastSuccess
```

**Step 8 — Add Note modal (BC-022, Bug 4).**

`frontend/src/features/Notes/NotesList.tsx` — "Add Note" button. On click → modal with markdown editor. Submit → `POST /api/notes { title, body }`. Success → insert into list, close modal.

Test:
```
frontend/src/features/Notes/__tests__/NotesList.test.tsx
    NotesList_AddNote_OpensEditor
    NotesList_AddNote_SubmitsAndInserts
    NotesList_EmptyState          (BC-019 — verify)
```

**Step 9 — Virtualisation (Bug 13, BC-053).**

Install (if not present): `npm --prefix frontend install react-virtuoso` — check `frontend/package.json` first; if absent, flag in the agent report (orchestrator approves).

Apply to `Queue.tsx` and `NotesList.tsx` when row count ≥ 50. Perf test:
```
frontend/__tests__/perf/Queue_100rows.test.tsx
    Renders_Under_150ms_On_100Rows
```

**Step 10 — Queue resume copy (BC-017, Bug 21).**

Backend adds `CheckpointAt` (Backend MR B). Frontend updates Queue row to show `"Resumed from 07:23"` when `job.resumedFromCheckpoint === true`. Small copy change; test asserts the label appears.

**Step 11 — Verify.** `npm run typecheck && npm run lint && npm test && npm run build`.

---

### 3.3 MR D — Sync tab

**Preconditions.** MRs C and B complete. Backend MR D must ship the `/api/sync/*` endpoints; you can red-first without waiting.

**Step 1 — Red-first tests.**

```
frontend/src/features/Sync/__tests__/SyncTab.test.tsx
    SyncTab_RendersFoldersAndDevices
    SyncTab_Folder_ShowsConflictBadge
    SyncTab_Devices_PairingModal_Reuses_SyncPairing
    SyncTab_EnableToggle_CallsSettingsPut

frontend/src/store/slices/sync/__tests__/saga.test.ts
    loadStatus_PollsEverySeconds
    streamEvents_SseReconnects
```

**Step 2 — Files.**

```
frontend/src/features/Sync/Sync.tsx               (tab container, sub-view switcher)
frontend/src/features/Sync/views/Devices.tsx
frontend/src/features/Sync/views/Folders.tsx
frontend/src/features/Sync/views/Conflicts.tsx
frontend/src/features/Sync/views/Settings.tsx
frontend/src/features/Sync/Sync.style.ts
frontend/src/features/Sync/types.ts
frontend/src/store/slices/sync/*                   (slice, same pattern as `recording`)
```

Add a sidebar entry in `frontend/src/components/Layout/Sidebar.tsx` with icon + label, route `/sync`. Register in `App.tsx`.

**Step 3 — Sub-views.**

- **Devices** — list from `/api/sync/status.devices`. Each row: name, deviceId short, connection state pill (connected / disconnected / pairing), lastSeen. Button "Pair new device" → opens existing `SyncPairing` modal (reuse).
- **Folders** — list from `/api/sync/status.folders`. Each row: folder id, completion %, conflicts badge (pulls from Conflicts view's count). Progress bar.
- **Conflicts** — list of `.sync-conflict-*` files (electron IPC `window.mozgoslav.listSyncConflicts(folderPath)` — add this IPC method to `preload.ts` + `main.ts`). Resolution is manual via Finder (documented in `docs/sync-conflicts.md` — create or restore this doc).
- **Settings** — toggle "Enable Syncthing" → `PUT /api/settings { syncthingEnabled }`. Future toggles live here.

**Step 4 — Reuse pairing.**

Existing `frontend/src/features/SyncPairing/*` stays. Sync tab's Devices view imports `<SyncPairingModal />` and controls `isOpen` state locally.

**Step 5 — Verify.** `npm test -- Sync && npm run typecheck && npm run lint`.

---

### 3.4 MR E — Dictation frontend

**Preconditions.** MRs C, B, D complete. Backend MR E may be in-flight; wire against `ADR-007-shared.md §2.7` for `/api/models/scan`.

**Step 1 — Dashboard record button (BC-004, Bug 3).**

This is the important one. Current `frontend/src/features/Dashboard/Dashboard.tsx:79-105` calls `api.startDictation()` / `api.stopDictation()` but never pushes audio. Implementation:

```ts
// In frontend/src/features/Dashboard/saga/recording.ts (or equivalent)
function* handleStart() {
    yield put(actions.setPhase("arming"));
    const { sessionId }: { sessionId: string } = yield call(api.startDictation, { source: "dashboard" });

    // Browser audio capture
    const stream: MediaStream = yield call(() =>
        navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000 } }));

    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 24_000,
    });

    const channel = eventChannel<Blob>(emit => {
        mediaRecorder.ondataavailable = e => emit(e.data);
        return () => mediaRecorder.stop();
    });

    mediaRecorder.start(250);  // 250 ms chunks
    yield put(actions.setPhase("recording"));

    try {
        while (true) {
            const blob: Blob = yield take(channel);
            const buf: ArrayBuffer = yield call(() => blob.arrayBuffer());
            yield call(api.dictationPush, sessionId, buf);
        }
    } finally {
        mediaRecorder.stop();
        stream.getTracks().forEach(t => t.stop());
        channel.close();
    }
}

function* handleStop(sessionId: string) {
    yield put(actions.setPhase("stopping"));
    const { transcript } = yield call(api.dictationStop, sessionId);
    yield put(actions.sessionComplete({ transcript }));
    yield put(actions.setPhase("idle"));
}
```

`api.dictationPush` sends `multipart/form-data` OR `application/octet-stream` — check existing `DictationEndpoints.cs` contract; if backend accepts `octet-stream`:

```ts
async dictationPush(sessionId: string, audioBuffer: ArrayBuffer) {
    const res = await fetch(API.dictationPush(sessionId), {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: audioBuffer,
    });
    if (!res.ok) throw new Error(`Dictation push failed: ${res.status}`);
}
```

Browser-pushed chunks are Opus-in-WebM, not raw PCM. Backend `/api/dictation/push` must decode (ffmpeg) — **verify this works with the existing handler**; if handler expects raw PCM only, **stop and escalate** (handler change is Backend MR E scope, but browser format is frontend's concern too).

Test:
```
frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx
    Dashboard_RecordButton_IdleToRecording
    Dashboard_RecordButton_StopsAndRendersTranscript
    Dashboard_RecordButton_PermissionDenied_ShowsError
```

Mock `navigator.mediaDevices.getUserMedia` + `MediaRecorder` in jest globals (`frontend/src/__tests__/setup/navigator.ts`).

**Step 2 — Folder picker + auto-detect (BC-033, Bug 14).**

Add electron IPC method:
- `frontend/electron/preload.ts` — `openModelFile: () => ipcRenderer.invoke("dialog:openModelFile")`.
- `frontend/electron/main.ts` — `ipcMain.handle("dialog:openModelFile", () => dialog.showOpenDialog({ filters: [{ name: "Whisper / VAD models", extensions: ["bin", "gguf"] }], properties: ["openFile"] }))`.

Also `openModelFolder: () => ipcRenderer.invoke("dialog:openModelFolder")` — returns the folder path for scanning.

Settings Models page + Get-Started Models step use these + call `GET /api/models/scan?dir=<path>`; rendered as a list for the user to select the active model.

Test:
```
frontend/__tests__/electron/main-dialog.test.ts
    Dialog_OpenModelFile_FiltersBinGguf
    Dialog_OpenModelFolder_ReturnsPath
```

**Step 3 — Tray icon (BC-003, Bug 12).**

Audit `frontend/electron/dictation/TrayManager.ts`:
- Confirm `process.resourcesPath` resolution works dev vs packaged. Fallback to `path.join(app.getAppPath(), "build", "tray-<phase>.png")` when `process.resourcesPath` path does not exist.
- `buildFallbackIcon` generates an in-memory PNG if both paths miss.

Test:
```
frontend/__tests__/electron/TrayManager.test.ts
    Tray_Fallback_RendersPngWhenAssetMissing
    Tray_Phase_SwapsImage
    Tray_Destroy_OnAppQuit
```

**Step 4 — Overlay (BC-002).**

Audit `frontend/electron/dictation/OverlayWindow.ts`:
- `focusable: false` is correct — document in comments that this is intentional per ADR-002 D8.
- `alwaysOnTop: true`, `transparent: true`, `frame: false`, `show: false` until first partial arrives.
- Force-hide on `phase === "error"`.

Test:
```
frontend/__tests__/electron/OverlayWindow.test.ts
    Overlay_Position_ClampsToDisplay
    Overlay_ErrorPhase_ForceHides
    Overlay_Disabled_InSettings_NotCreated
```

**Step 5 — Verify.**

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

All green.

---

## 4. Shared-file coordination

Touch-list:
- `frontend/src/constants/api.ts` — you own this file; write it once at the start of MR C; do not touch after.
- `frontend/src/constants/routes.ts` — append new routes; do not touch existing lines.
- `frontend/src/App.tsx` — append new routes; do not touch existing lines.
- `frontend/src/components/Layout/Sidebar.tsx` — append new entries; do not touch existing lines.
- `frontend/electron/main.ts`, `preload.ts` — append IPC methods; do not rewrite existing handlers.

---

## 5. Acceptance checklist

- [ ] `npm --prefix frontend run typecheck` — green.
- [ ] `npm --prefix frontend run lint` — green.
- [ ] `npm --prefix frontend test` — green (all new tests pass; existing tests not broken).
- [ ] `npm --prefix frontend run build` — bundles without error.
- [ ] `frontend/src/constants/api.ts` matches `ADR-007-shared.md §2` (no endpoint missing, no extras).
- [ ] Sidebar renders Dashboard, Queue, Notes, RagChat, Profiles, **Obsidian**, **Sync**, Models, Settings, Logs, Backups (new items: RagChat, Obsidian tab promoted, Sync).
- [ ] `phase2-frontend-report.md` at repo root: closed BCs, closed bugs, route list, new file list, open items (e.g. packaging-only UX to verify on macOS host).

---

## 6. Escalation triggers

- `motion` (Framer Motion) API drift from the one used in the rest of the app → escalate; do not cargo-cult a second animation library.
- Dashboard browser-push audio format incompatible with backend `/api/dictation/push` handler → escalate. Coordination with Backend agent required.
- `react-virtuoso` absent from `package.json` → flag as Open Item; do not `npm install` without orchestrator approval.
- Electron IPC method signature collides with an existing handler → escalate; rename the new one.
- Any test that Phase 1 did not touch fails after your change → stop, you hit a shared-state regression; bisect and report.

---

## 7. Skills

- `superpowers:test-driven-development` (mandatory).
- `superpowers:verification-before-completion` (mandatory).
- `superpowers:systematic-debugging` (for SSE reconnect + MediaRecorder edge cases).
- `superpowers:writing-plans` (MR C — multi-file RagChat).
- `superpowers:requesting-code-review` (before hand-back).
