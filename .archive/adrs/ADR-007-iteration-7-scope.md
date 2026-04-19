# ADR-007 — Iteration 7 (master)

- **Status:** Accepted (2026-04-17).
- **Supersedes:** none.
- **Related:** ADR-001..006 archived at `.archive/adrs/`.
- **Execution:** siblings — `ADR-007-shared.md`, `ADR-007-phase1-agent-A.md`, `ADR-007-phase2-backend.md`,
  `ADR-007-phase2-frontend.md`, `ADR-007-phase2-python.md`, `ADR-007-phase2-swift.md`.
- **Base branch reviewed:** `origin/shuka/adr-006-ux-lm-studio-v2 @ 4cefb4be3e4dc4e3bccb64b78be9820e68558c84`.

This file is the **canonical source of truth for WHAT** (business cases, bugs, non-goals). Sibling files cover **HOW** (
conventions, API contract, per-agent execution plan).

---

## 1. Context

Mozgoslav on branch `shuka/adr-006-ux-lm-studio-v2` is a macOS-first local second-brain app: Electron + React 19 +
Redux-Saga renderer ↔ ASP.NET Minimal API on .NET 10 (EF Core SQLite, Whisper.net, OpenAI SDK) ↔ FastAPI Python
sidecar (ML stubs) ↔ Swift native helper (macOS AX injection + audio capture). Privacy-first, zero telemetry.

The branch introduced an UX + LLM-provider pass (D-1..D-15.d) but regressed by removing entire feature surfaces (RAG
pipeline, Syncthing lifecycle + frontend, ADR-004 R4/R5, `ModelDownloadService`). The branch **does not compile** (3
IDISP analyzer errors in `FfmpegAudioRecorder`, `TreatWarningsAsErrors=true`).

Iteration 7 restores what was dropped (scope in §2), fixes what is broken (§4 bugs), and lands the UX polish the user is
waiting for — all TDD-first (see `ADR-007-shared.md`).

---

## 2. Scope and phasing

Work runs in the local tarball-extracted folder `mozgoslav-20260417/mozgoslav/`. **No git, no MRs, no branches.**

### 2.1 Two execution phases

| Phase       | Agents                                                               | Parallelism                                              | Purpose                                                                                                                                                                                                                                                                                                                     |
|-------------|----------------------------------------------------------------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Phase 1** | 1 agent (**A — Foundation**)                                         | Sequential (solo)                                        | Make the solution compile, repair shared surfaces (`Program.cs`, `DbContext`, migrations, settings), rewrite `LogsController`, sweep primary-constructors, fix every bug whose root-cause is in a shared file. Ends when `dotnet build -c Release` and frontend `typecheck + lint + test` are green on the untouched areas. |
| **Phase 2** | 4 agents, parallel: **Backend**, **Frontend**, **Python**, **Swift** | Fully parallel (no shared-file collisions after Phase 1) | Implement all remaining business cases per-stack. Each Phase-2 agent works in its own code area only. Coordination point is the API contract frozen at end of Phase 1 (see `ADR-007-shared.md §API contract`).                                                                                                              |

### 2.2 Legacy wave order preserved inside each Phase-2 agent

The legacy «merge order A → C → B → D → E» becomes the **internal work order** of the Backend and Frontend agents (C =
RAG, B = UX, D = Syncthing, E = Dictation). Each agent does:

1. red-first tests for the wave it is on,
2. implementation to turn them green,
3. moves to the next wave.

Phase 1 Agent A's scope absorbs all items that legacy §0.1 called «MR A» (because those items touch shared files —
Foundation).

### 2.3 Out of scope (non-goals)

- **Calendar / meeting autostart (ADR-006 D-series)** — deferred. Blocker: robust native audio recorder.
- **Native Swift `AVAudioEngine` helper** — `FfmpegAudioRecorder` stays long-term.
- **`electron-builder --mac` packaging run** — macOS-host only, out of sandbox.
- **Arbitrary new LLM providers (Groq, xAI, OpenRouter)** — not requested.
- **Real ML in Python sidecar** (diarization / gender / emotion / NER) — stubs only. `/embed` is the sole real endpoint
  added.
- **Dark-mode polish beyond current tokens.**
- **UI-exposed languages beyond RU/EN.**
- **Bug N4 (dual LLM surface)** — deferred to later iteration.

---

## 3. Decisions locked for Iteration 7 (read-only in specs)

| #   | Decision                  | Value                                                                                                                                                                                                                                              |
|-----|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| D1  | Default Whisper source    | **User-hosted `antony66` ggml on GitLab releases.** `ModelCatalog[0].Url` points at the GitLab release asset. Attribution preserved.                                                                                                               |
| D2  | Model catalogue paradigm  | **Folder-pick primary + URL download Advanced.** Onboarding Models step defaults to folder-pick (`.bin` / `.gguf` auto-detected). URL-download under "Advanced" with progress bar.                                                                 |
| D3  | `IAudioRecorder` strategy | **Ffmpeg long-term.** `FfmpegAudioRecorder` fixed + covered. Native `AVAudioEngine` helper deferred.                                                                                                                                               |
| D4  | LLM provider default      | **`openai_compatible`** (LM Studio happy path). RagChat routes through `LlmProviderFactory`.                                                                                                                                                       |
| D5  | Web API style             | **Minimal API everywhere EXCEPT Logs.** `LogsController : ControllerBase` with `[ApiController]` + `[Route("api/logs")]`. Other modules stay Minimal API. Coexistence is explicit (one directive, not a policy).                                   |
| D6  | C# class shape            | **No primary constructors.** Traditional ctors with explicit `private readonly` fields. Phase 1 Agent A audits existing branch code and converts. Every new test / impl follows the rule.                                                          |
| D7  | Vector index              | **`sqlite-vec`** — embedded in SQLite, no new process.                                                                                                                                                                                             |
| D8  | Embeddings                | **Multilingual via Python sidecar `/embed`.** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (or equivalent ≤ 500 MB multilingual). Deterministic SHA-256 BoW fallback for dev boxes without PyTorch. 384-dim L2-normalised output. |
| D9  | RAG citations             | Required in `POST /api/rag/query` response: `{answer, citations: [{noteId, segmentId, text, snippet}]}`.                                                                                                                                           |
| D10 | RagChat UX                | Full-page single surface, placeholder `"Привет, введи сюда…"`, subtle enter/exit + typing-indicator animations (AnythingLLM-style). Layout reference: Meetily Summary. Bubble + "Ask" paradigm from commit `81afb1d` removed.                      |
| D11 | Syncthing lifecycle       | `SyncthingLifecycleService : IHostedService`. Random free local port at first run. API-key generated on first run and persisted to `settings.db`. Graceful shutdown via `POST /rest/system/shutdown`.                                              |
| D12 | Syncthing config          | Restore `SyncthingConfigService` — 3 folders per ADR-003 D4 (recordings staggered/30d; notes trashcan/30d; vault trashcan/14d). Restore `SyncthingVersioningVerifier` (ADR-004 R8). Default `.stignore` templates (ADR-004 R7).                    |
| D13 | Sync tab                  | `frontend/src/features/Sync/` — first-class sidebar tab. Sub-views: Devices, Folders (completion %, conflicts badge), Conflicts, Settings. `SyncPairing` feature reused as pairing-modal entry.                                                    |
| D14 | Typography                | Body-sm ≥ 14 px, weights revisited. Snapshot test locks ramp in `frontend/__tests__/styles/Theme.test.ts`.                                                                                                                                         |
| D15 | Get-Started gating        | Each Onboarding step gated on its precondition (LLM ping, model file on disk, permissions granted). Optional steps expose grey Skip at ≤ 60 % opacity of primary CTA. Welcome step gets subtle brand animation.                                    |
| D16 | Obsidian tab              | First-class sidebar tab. Buttons: "Sync all" (`POST /api/obsidian/export-all`) + "Разложить по PARA" (`POST /api/obsidian/apply-layout`).                                                                                                          |
| D17 | Testing stance            | **Red-first.** Tests compile / import and fail for the right reason (missing symbol, missing route, explicit assertion mismatch) before implementation. Impl agent must not rewrite a test silently — escalate.                                    |

---

## 4. Business case catalogue (53 BCs — source of truth)

Format: `**BC-XXX | Area | ADR refs.** "One-sentence user-voice statement."` + bullets for Happy / Edge / Out-of-scope.

The full §4 catalogue is unchanged from the original `ADR-007-iteration-7.md` §2 — it is the load-bearing contract
between business and every agent. For brevity here, the 53 entries are referenced by their headings; the full text lives
**inline in this file** in the following subsections. An agent MUST read its assigned BCs word-for-word before writing
tests.

### 4.1 Dictation (ADR-002, ADR-004 R1–R5)

**BC-001 | Dictation | ADR-002 D-all, ADR-004 R1/R3.** "I press mouse-5 anywhere, speak, release, and the text I spoke
appears in the currently focused app."

- Happy: helper captures PCM 48 kHz chunks; backend `/api/dictation/start`→`/push`→`/stop`; Whisper.net streams
  partials; overlay shows partials; on release, final text injects via AX; overlay fades.
- Edge: hotkey not permitted (Input Monitoring off) → tray error state, toast with deeplink to System Preferences; LLM
  polish off → raw text injects without LLM call; microphone permission denied → error, no session.
- Out-of-scope: Dashboard browser-side record button (see BC-004).

**BC-002 | Dictation | ADR-002 D8 + OverlayWindow.** "A small floating overlay near my cursor shows me what's being
transcribed in real time."

- Happy: overlay appears at cursor, non-focusable, always-on-top; partials stream via SSE; overlay fades 500 ms after
  release.
- Edge: overlay disabled in settings (`DictationOverlayEnabled=false`) → no overlay window; overlay stuck after error →
  must be force-hidden on `error` phase.
- Out-of-scope: user clicking the overlay (deliberately non-focusable).

**BC-003 | Dictation | ADR-002 D6 + TrayManager.** "A menu-bar tray icon tells me whether dictation is idle /
recording / processing / failing."

- Happy: `TrayManager.setPhase()` swaps image per phase; fallback solid-colour 16×16 PNG guarantees a visible icon
  without asset files.
- Edge: no `build/tray-<phase>.png` → `buildFallbackIcon` generates a PNG; tray destroyed on app quit.
- Out-of-scope: tray click-to-start (not implemented; tray menu exposes Quit only).

**BC-004 | Dictation | ADR-006 D-8.** "There's a big Brain button on the Dashboard that does the same thing as mouse-5 —
press to start, press to stop."

- Happy: `BrainLauncher` 4-state machine; click → `/api/dictation/start` → `recording`; second click →
  `/api/dictation/stop/{id}`.
- Edge: states `arming`/`stopping` → button disabled; start rejected 409 → toast, back to `idle`; no audio pushed →
  backend `StopAsync` returns empty transcript.
- Out-of-scope: in-browser audio capture gap addressed in Backend agent MR E (Iteration 7).

**BC-005 | Dictation | ADR-004 R1.** "My Whisper transcription knows my custom vocabulary."

- Happy: `DictationSessionManager.BuildInitialPrompt` joins `DictationVocabulary` into Whisper `initial_prompt`.
- Edge: empty vocabulary → `null`; duplicates deduped; whitespace trimmed.
- Out-of-scope: global cross-profile dictionary.

**BC-006 | Dictation | ADR-004 R2.** "When I dictate into VS Code I get the code-profile; into Slack the
informal-profile; into Chrome the default."

- Happy: bundle-id to profile-id map from `AppSettingsDto.DictationAppProfiles`.
- Edge: unknown bundle-id → default profile; empty map → default. Helper `detectTarget` returns bundleId.
- Out-of-scope: runtime per-app profile *enforcement* — regression to fix in Backend agent MR E.

**BC-007 | Dictation | ADR-004 R3.** "If AX injection times out, mozgoslav falls back to clipboard."

- Swift helper `inject.text` with `mode:"auto"`. AX fallback → clipboard paste with save/restore of prior clipboard.
- Edge: permissions revoked mid-session → error surfaced; AX + clipboard both fail → `ok:false` with reason.

**BC-008 | Dictation | ADR-004 R4.** "Whisper model releases RAM after a few minutes idle, so it doesn't keep 1.6 GB
hot."

- **Gap today**: `IdleResourceCache<T>` deleted — restore in Backend agent MR E. `DictationModelUnloadMinutes` (default
  10) triggers dispose; next call re-loads with 1-2 s latency.
- Edge: re-entrant calls under load → factory stays warm; thread safety via `Interlocked`.

**BC-009 | Dictation | ADR-004 R5.** "If the app crashes mid-dictation, my audio buffer is on disk and I can recover
it."

- **Gap today**: crash-recovery PCM dump has no service registered — restore in Backend agent MR E.
- Edge: orphan temp files on startup → WARN log + path; manual recovery (no UI hook in Iteration 7).

---

### 4.2 Recording & processing pipeline (ADR-001)

**BC-010 | Recording | ADR-001 §Pipeline.** "I drag an audio file onto the Dashboard, it is imported, transcribed,
summarized and exported to my Obsidian vault."

- Happy: Dashboard onDrop → `api.uploadFiles()` → `POST /api/recordings/upload` (multipart). `QueueBackgroundService`
  dequeues, runs `ProcessQueueWorker`. Progress SSE at `/api/jobs/stream`.
- Edge: duplicate import (same sha256) → idempotent (`Recording.Sha256` unique index). Unsupported format → reject on
  upload.
- Out-of-scope: manual note creation (BC-022).

**BC-011 | Recording | ADR-001.** "I can import a folder of audio files by native file-picker."

- Happy: Dashboard `pickViaDialog` → `window.mozgoslav.openAudioFiles()` → `api.importByPaths`.
- Edge: user cancels picker → no-op.

**BC-012 | Recording | ADR-001.** "I can re-process a recording with a different profile."

- Happy: `POST /api/recordings/{id}/reprocess { profileId }`.
- Edge: unknown profile → 404.

**BC-013 | Recording pipeline | ADR-001 §LLM.** "If my LLM endpoint is unreachable, I still get a raw transcript — just
no summary."

- Happy: `OpenAiCompatibleLlmService.ProcessAsync` → `LlmProvider.ChatAsync` catches exceptions and returns `""`;
  `LlmChunker.ParseOrRepair("")` returns `Empty`; pipeline continues.
- Edge: partial JSON — `LlmChunker.ParseOrRepair` falls back to `Summary = rawContent.Trim()`.

**BC-014 | Queue | ADR-001.** "I can see every processing job in the Queue page with live progress."

- Happy: Queue subscribes to `/api/jobs/stream` SSE; initial list via `/api/jobs`.
- Edge: empty state; backend offline → SSE reconnect.

**BC-015 | Queue | ADR-006 D-9.** "I can cancel a queued job; cancelling an in-flight job marks it Failed; cancelling a
finished job is rejected."

- Happy: `DELETE /api/queue/{id}` with 4 outcomes (204 / 200 / 409 / 404). UI cancel button.
- Edge: cancel button disabled while the cancel request is in-flight.
- Out-of-scope: «dismiss from list» for already-Failed jobs.

**BC-016 | Queue | new in Iteration 7.** "If my machine crashes or I quit mid-process, the queue survives and my job
resumes from where it was, not from scratch."

- Resolution (Phase 1): startup reconciliation in `QueueBackgroundService` — `Running` jobs flip to `Queued` (or
  `Failed` with reason "app restarted").

**BC-017 | Queue | new in Iteration 7.** "For long files I get a checkpoint every ~5 minutes so resume is cheap."

- Resolution (Backend MR B): `TranscriptCheckpoint` semantics — `Transcript.Segments` persist at ~5 min granularity;
  resume reads last checkpoint.

**BC-018 | Recording metadata | ADR-001.** "The recording list shows format, duration and status at a glance."

- Happy: Dashboard status badge by `ProcessingJob.Status`.
- Edge: format string vs enum handled at render time; unknown status → `neutral` tone.

---

### 4.3 Notes (ADR-001)

**BC-019 | Notes | ADR-001.** "I see a list of processed notes from past recordings."

- Happy: `NotesList` fetches `/api/notes`. Empty → EmptyState.

**BC-020 | Notes | ADR-001.** "I open a note and see the full summary, key points, decisions, action items, tags."

- Happy: `/api/notes/{id}` → `NoteViewer`.

**BC-021 | Notes | ADR-001.** "I can trigger a manual export of a note to my Obsidian vault."

- Happy: `POST /api/notes/{id}/export` via `MozgoslavApi.exportNote`.
- Edge: vault path unset → 400.

**BC-022 | Notes | new in Iteration 7 (bug 4).** "I can create a manual note (not from a recording) — blank canvas or
templated."

- Resolution (Backend MR B + Frontend MR B): `POST /api/notes` returns 201 + `ProcessedNote` stub with `Source=Manual`;
  UI: "Add Note" → modal with markdown editor.

---

### 4.4 Obsidian export (ADR-001)

**BC-023 | Obsidian | ADR-001.** "I pick my vault folder once and the app knows where to export notes."

- Happy: Obsidian page `pickVault` → save to `settings.vaultPath`.

**BC-024 | Obsidian | ADR-001.** "I scaffold a default folder layout in my vault (Inbox / Projects / People / Topics /
Archive / Templates)."

- Happy: `POST /api/obsidian/setup { vaultPath }` → `ObsidianSetupService`. Idempotent.

**BC-025 | Obsidian | new in Iteration 7 (bug 22).** "Obsidian is a first-class sidebar tab with two actions: 'Sync all
un-exported notes now' and 'Разложить по PARA'."

- Resolution (Backend MR B + Frontend MR B): `POST /api/obsidian/export-all` (bulk-export) +
  `POST /api/obsidian/apply-layout` (FolderMapping + VaultExportRule domain entities — add as plain records + migration
  if absent).

**BC-026 | Obsidian | ADR-003 companion.** "Notes exported into the vault are picked up by Obsidian (Syncthing-synced
vault) on my phone later."

- Depends on Syncthing path being functional (Backend + Frontend MR D).

---

### 4.5 Profiles (ADR-001, ADR-004 R2)

**BC-027 | Profiles | ADR-001.** "I have three built-in profiles (Meeting / 1:1 / Idea-dump) I can read but not delete."

- Happy: `BuiltInProfiles.All` seeded at startup. `EfProfileRepository.DeleteAsync` refuses `IsBuiltIn=true`.
- Edge: idempotent seeding.

**BC-028 | Profiles | ADR-006 D-15.b.** "I create a custom profile with my own system prompt, cleanup level, export
folder and auto-tags."

- Happy: `POST /api/profiles` via `MozgoslavApi.createProfile`.

**BC-029 | Profiles | ADR-006 D-15.b.** "I duplicate an existing profile to start from a clean copy."

- Resolution (Backend MR B): `POST /api/profiles/{id}/duplicate` if missing.

**BC-030 | Profiles | ADR-006 D-15.b.** "Each profile can carry a `transcriptionPromptOverride` that feeds Whisper's
`initial_prompt` instead of the global vocabulary."

- Resolution (Backend MR E): `DictationSessionManager.BuildInitialPrompt` prefers `profile.TranscriptionPromptOverride`
  over `DictationVocabulary`.

**BC-031 | Profiles | ADR-006 D-15.b.** "I delete a user-created profile; built-ins resist deletion."

- Covered in BC-027 edge. Tests: `Profiles_Delete_UserCreated_ReturnsNoContent`,
  `Profiles_Delete_BuiltIn_ReturnsConflict`.

---

### 4.6 Models & downloads (ADR-001, ADR-006 D-11)

**BC-032 | Models | ADR-006 D-11.** "The Models page is read-only: it shows what's on disk, no download buttons —
downloads happen in LM Studio." (Catalogue-URL download restored separately as Advanced — see BC-034.)

- Happy: `ModelEndpoints` returns catalogue + installed status; Models page renders cards.

**BC-033 | Models | new (bug 14).** "I drop a .bin or .gguf Whisper/VAD model file into a folder and the app detects it
automatically."

- Resolution (Backend MR E + Frontend MR E): `GET /api/models/scan?dir=<path>` returns `[{path,filename,size,kind}]`;
  electron IPC `dialog:openModelFile` with `.bin`/`.gguf` filter; Settings + Onboarding Models step wire this up.

**BC-034 | Models | bugs 1+2.** "The default Whisper model is reachable — either a working URL (GitLab-hosted antony66
ggml), or detected locally."

- Resolution (Phase 1): update `ModelCatalog[0].Url` → GitLab release URL; align `AppPaths.DefaultWhisperModelPath`
  filename with catalogue entry filename. Restore `ModelDownloadService` + `POST /api/models/download` + SSE progress
  channel.

**BC-035 | Models | ADR-006 D-11.** "LM Studio Suggested catalogue has 5 curated rows with one-click open-in-LM-Studio
deeplinks."

- Happy: `LmStudioEndpoints.Suggested` hard-coded array; UI opens `lmstudio://...` deeplinks.

---

### 4.7 LLM provider (ADR-006 D-14)

**BC-036 | LLM | ADR-006 D-14.** "I pick 'OpenAI-compatible / Anthropic / Ollama' as provider, set endpoint + model +
key, and everything routes correctly."

- Happy: `LlmProviderFactory.GetCurrentAsync` returns selected provider. Default `openai_compatible`.

**BC-037 | LLM | ADR-006 D-14.** "LM Studio reachability badge in Settings tells me if the server is up."

- Happy: Settings swaps copy on `lmDiscovery.reachable`. `LmStudioHttpClient.ListModelsAsync` catches
  `HttpRequestException` and returns `Reachable:false`.
- Edge: timeout 3 s.

**BC-038 | LLM | ADR-006 D-14.** "I pick a loaded LM Studio model from the discovery list; the app remembers my pick."

- Happy: Settings row click → `update("llmModel", model.id)`.

**BC-039 | LLM | ADR-005 + D-14.** "When I ask a question over my notes, the answer comes back grounded with citations."

- Resolution (Backend + Frontend + Python agents MR C): restore full RAG pipeline per §3 D7–D10. Full-page RagChat.

---

### 4.8 Settings & onboarding (ADR-006 D-15.d)

**BC-040 | Onboarding | ADR-006 D-15.d.** "On first run I go through Welcome → Models → Obsidian → LLM → Syncthing →
Mic → AX → Input-Monitoring → Ready."

- Happy: 9-step state machine. `markComplete` writes `onboardingComplete=true`.
- Edge: Skip per step (grey, subordinate). Re-entry via Settings.

**BC-041 | Onboarding | new (bug 16).** "Back / Skip / Next controls look and feel equally substantial — not pale ghost
buttons next to a bold primary."

- Resolution (Frontend MR B): typography bump; Back `variant="secondary"`; Skip grey at ≤ 60 % opacity of primary.

---

### 4.9 Logs (ADR-001)

**BC-042 | Logs | ADR-001 §Observability.** "I open the Logs page and see the tail of the current day's mozgoslav log."

- Happy: Logs page calls `api.tailLog(undefined, 400)`. Backend `LogsController` (MVC, rewritten per D5) exposes
  `GET /api/logs` and `GET /api/logs/tail?file=&lines=`.
- Edge: no log files → empty state.

**BC-043 | Logs | ADR-001.** "Logs rotate daily, last 14 retained, past entries still browsable via file picker on the
page."

- Happy: Serilog config `RollingInterval.Day`, `retainedFileCountLimit:14`.

---

### 4.10 Backups (ADR-001 §Backup)

**BC-044 | Backups | ADR-001.** "I take a one-click SQLite backup to `AppPaths.Root/backups`."

- Happy: `BackupService.CreateAsync`; `POST /api/backup/create`; `GET /api/backup` lists.

---

### 4.11 Meetily import (ADR-001)

**BC-045 | Meetily import | ADR-001 §Import.** "I import my existing Meetily SQLite database and all its
recordings/transcripts become mozgoslav recordings."

- Happy: `POST /api/meetily/import { meetilyDatabasePath }` → `MeetilyImporterService`.

---

### 4.12 Health (ADR-001)

**BC-046 | Health | ADR-001.** "The sidebar shows an online/offline dot for the backend."

- Happy: `useBackendHealth` ping every 5 s.

**BC-047 | Health | ADR-001.** "I can force a one-shot LLM reachability check from Settings."

- Happy: Settings `checkLlm` → `/api/health/llm` → toast.

---

### 4.13 Syncthing (ADR-003 + bugs 6, 23)

**BC-048 | Sync | ADR-003 D3.** "Mozgoslav reports Syncthing status (folders + devices) when the binary is running."

- Happy: `/api/sync/status` via `ISyncthingClient`. `SyncthingHttpClient` hits `/rest/config/folders`,
  `/rest/db/status?folder=`, `/rest/system/connections`.
- Edge: Syncthing unreachable → 503 JSON `{ error:"syncthing-unavailable" }`.

**BC-049 | Sync | ADR-003 D3 + bug 6.** "On first boot mozgoslav spawns the bundled Syncthing binary on a random port +
api-key, doesn't hammer :8384 before it's up."

- Resolution (Backend MR D): `SyncthingLifecycleService` + random port + API-key.

**BC-050 | Sync | new (bug 23).** "Sync is a first-class sidebar tab with paired devices, folder % completion, conflicts
and toggles."

- Resolution (Frontend MR D): `frontend/src/features/Sync/*`. SyncPairing pairing-modal reused.

---

### 4.14 Tech debt (tested to the same bar)

**BC-051 | Tech debt | bug 7.** "No EF Core value-comparer warnings at startup."

- Resolution (Phase 1): `MozgoslavDbContext.OnModelCreating` adds `.Metadata.SetValueComparer(...)` on 8 list
  properties.

**BC-052 | Tech debt | bug 8.** "No duplicated 'SQLite schema ensured' / 'Seeded 3 built-in profiles' log lines on boot;
no Kestrel 'Overriding address(es)' WRN."

- Resolution (Phase 1): remove duplicate host config (`appsettings.json` `Urls` xor `ConfigureKestrel`); audit
  `DatabaseInitializer` scope vs singleton.

**BC-053 | Tech debt | user verdict 24.** "UI feels finished, not stub-like. Typography, spacing, affordances,
first-class tabs all coherent."

- Resolution (Frontend MR B): sum of typography + spacing + affordances + tabs deliverables in §3 D14–D16.

---

## 5. Bug catalogue (live, runtime-observed)

Severity scale: **Blocker** / **High** / **Medium** / **Low**.

### Bug 1 — Default Whisper model URL 500s

- **Symptom.** `ModelCatalog[0]` URL (`Limtech/whisper-large-v3-russian-ggml`) returns HTTP 500.
- **Root cause.** External host. Also: `ModelDownloadService` deleted; no download endpoint. Catalogue entry decorative.
- **Severity.** High.
- **Evidence.** `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs:13-20`. Missing: `ModelDownloadService.cs`,
  `POST /api/models/download`.
- **Affected BCs.** BC-034, BC-001.
- **Owner.** Phase 1 Agent A.

### Bug 2 — "Whisper model not configured or missing on disk"

- **Symptom.** `InvalidOperationException` at transcription start: model absent at `AppPaths.DefaultWhisperModelPath`.
- **Root cause.** `WhisperModelPath` seeded as `ggml-large-v3-q8_0.bin`; catalogue URL points at `ggml-model-q8_0.bin`.
  Filename mismatch; no download endpoint.
- **Severity.** Blocker for transcription.
- **Evidence.** `WhisperNetTranscriptionService.cs:163-173`, `AppSettingsDto.cs:44`, `AppPaths.cs:28-29`,
  `DatabaseInitializer.cs:64-69`, `ModelCatalog.cs:13-20`.
- **Affected BCs.** BC-034, BC-001, BC-010.
- **Owner.** Phase 1 Agent A.

### Bug 3 — Record button doesn't record anything useful

- **Symptom.** Dashboard record button clickable; pressing does not capture audio → no transcript.
- **Root cause.** `Dashboard.tsx:79-105` calls `api.startDictation()` / `api.stopDictation()` but never pushes audio.
  Audio-push only via Electron mouse-5 flow. Server-side session runs against empty audio channel.
- **Severity.** Blocker for the D-8 claim.
- **Evidence.** `frontend/src/features/Dashboard/Dashboard.tsx:79-105`, `DictationSessionManager.cs:196-219`,
  `DictationEndpoints.cs:36-64`, `WhisperNetTranscriptionService.cs:163-173`.
- **Affected BCs.** BC-004.
- **Owner.** Frontend MR E + Backend MR E.

### Bug 4 — No "Add Note" button in Notes UI

- **Symptom.** Notes page shows list + empty state only; no create-note affordance.
- **Root cause.** `NotesList.tsx` has no "new" button. No `POST /api/notes` endpoint.
- **Severity.** Medium.
- **Affected BCs.** BC-022.
- **Owner.** Backend MR B + Frontend MR B.

### Bug 5 — RagChat doesn't reach LM Studio

- **Symptom.** User types a question; nothing happens.
- **Root cause.** Entire RAG pipeline deleted: `RagService`, adapters, vector indices, endpoint, frontend feature
  folder, redux slice.
- **Severity.** Blocker.
- **Affected BCs.** BC-039.
- **Owner.** Backend + Frontend + Python MR C.

### Bug 6 — Syncthing REST probed at hardcoded :8384 pre-binary

- **Symptom.** Runtime log `GET http://127.0.0.1:8384/rest/system/status → Connection refused` on every boot.
- **Root cause.** `Program.cs:141-143` registers `SyncthingHttpClient` with fixed base `http://127.0.0.1:8384`. No
  `SyncthingLifecycleService`.
- **Severity.** High.
- **Affected BCs.** BC-048, BC-049.
- **Owner.** Phase 1 Agent A (guard) + Backend MR D (full lifecycle).

### Bug 7 — EF Core value-comparer warnings × 8

- **Symptom.** 8 startup WRNs on collection properties.
- **Root cause.** `OnModelCreating` attaches value converters without `.Metadata.SetValueComparer(...)` on
  `ProcessedNote.{KeyPoints, Decisions, ActionItems, UnresolvedQuestions, Participants, Tags}`, `Profile.AutoTags`,
  `Transcript.Segments`.
- **Severity.** Low.
- **Evidence.** `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs:32-145`.
- **Affected BCs.** BC-051.
- **Owner.** Phase 1 Agent A.

### Bug 8 — Duplicate log lines + Kestrel "Overriding address(es)" WRN

- **Symptom.** `SQLite schema ensured` × 3, `Seeded 3 built-in profiles` × 3, Kestrel Urls WRN.
- **Root cause.** Double endpoint config (`appsettings.json:11 Urls` + `Program.cs:48 ConfigureKestrel`). Triple-log
  likely `DatabaseInitializer` singleton + scoped `IProfileRepository` scope materialisation per `AddAsync`.
- **Severity.** Low.
- **Owner.** Phase 1 Agent A.

### Bug 9 — Logs page empty

- **Symptom.** Logs UI always empty.
- **Root cause (hypothesis).** Path mismatch — Serilog writes to `AppPaths.Logs`; `LogsEndpoints.cs` scans a different
  path. Also: user directive — rewrite as `LogsController`.
- **Severity.** Medium.
- **Owner.** Phase 1 Agent A.

### Bug 10 — Profiles page empty despite seed log

- **Symptom.** UI at `/profiles` empty though backend logs "Seeded 3 built-in profiles".
- **Root cause hypothesis.** DB path mismatch — seeding writes one `.db`, UI reads another; OR deserialisation broken
  post `models → types` rename.
- **Severity.** Blocker for Profiles UX.
- **Owner.** Phase 1 Agent A.

### Bug 11 — DB path / seed / migration suspicion

- **Root cause.** General framing of bugs 9+10. Env-var override `Mozgoslav__DatabasePath` may shadow
  `AppPaths.Database`.
- **Owner.** Phase 1 Agent A (confirm single path, add startup log).

### Bug 12 — Tray icon missing; overlay hangs non-clickable

- **Symptom.** No tray icon; overlay visible but non-clickable.
- **Root cause.** Overlay `focusable:false` is intentional (ADR-002 D8). Tray missing → likely `process.resourcesPath`
  mismatch dev vs packaged, or helper-init exception before tray build.
- **Severity.** High (tray) + Medium (overlay expectation).
- **Owner.** Frontend MR E.

### Bug 13 — Frontend lag

- **Root cause hypotheses.** (a) Liquid Glass `backdrop-filter` on sidebar without verified `@supports not`; (b) no
  virtualisation on Queue/Notes lists.
- **Severity.** Medium.
- **Owner.** Frontend MR B.

### Bug 14 — No folder-picker + auto-detect for .bin / .gguf

- **Symptom.** User can't drop a local file + have app detect.
- **Root cause.** `Settings.pickWhisperFile` uses audio-filter picker; no `openModelFile` IPC handler; no scan endpoint.
- **Severity.** Medium.
- **Owner.** Backend MR E + Frontend MR E.

### Bug 15 — Agent-B self-admission: nothing verified at runtime

- **Severity.** Blocker (expressed by N1 below).
- **Owner.** Phase 1 Agent A (build green) + all agents (tests per shared contract).

### Bug 16 — Onboarding Back button + overall typography too delicate

- **Owner.** Frontend MR B.

### Bug 17 — RagChat UX wrong shape

- **Owner.** Frontend MR C.

### Bug 18 — Top-of-Dashboard spacing

- **Owner.** Frontend MR B.

### Bug 19 — Queue cancel button missing from UI despite D-9 ✅

- **Owner.** Frontend MR A-follow-up (backend shipped, UI missing) — assigned to **Frontend agent** as part of MR B
  polish.

### Bug 20 — Queue must persist across app launches

- **Owner.** Phase 1 Agent A (startup reconciliation `Running → Queued`/`Failed`).

### Bug 21 — Queue resume from checkpoint (~5 min)

- **Owner.** Backend MR B (`Transcript.Segments` checkpoint persistence + resume path).

### Bug 22 — Dedicated Obsidian tab

- **Owner.** Backend MR B + Frontend MR B.

### Bug 23 — Dedicated Sync tab

- **Owner.** Backend MR D + Frontend MR D.

### Bug 24 — UX verdict "doesn't reflect product vision"

- **Owner.** Frontend MR B (sum of typography, tabs, affordances, animations).

### Bug 25 — Mandatory Get-Started gating with subtle grey Skip

- **Owner.** Frontend MR B.

### Bug 26 — Model download progress bar

- **Owner.** Phase 1 Agent A (backend SSE channel) + Frontend MR B (frontend component).

### Bug N1 — Solution does not build (IDISP on `FfmpegAudioRecorder`)

- **Symptom.** `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` fails with 3 analyzer errors (`IDISP006` +
  2× `IDISP003`) — `TreatWarningsAsErrors=true` promotes them.
- **Evidence.** `backend/src/Mozgoslav.Infrastructure/Services/FfmpegAudioRecorder.cs:22-102`.
- **Severity.** Blocker.
- **Owner.** Phase 1 Agent A (first step).

### Bug N2 — Frontend Queue perf on large lists

- **Symptom.** Re-render storm possible on ≥ 100 queue rows (no virtualisation).
- **Owner.** Frontend MR B (virtualise; perf test BC-053).

### Bug N3 — Profile `transcriptionPromptOverride` not wired to Whisper

- **Symptom.** Field persists but Whisper receives only `DictationVocabulary`.
- **Owner.** Backend MR E.

### Bug N4 — Dual LLM surface (`ILlmService` legacy + `ILlmProvider` new)

- **Severity.** Low.
- **Owner.** Deferred (out of Iteration 7 scope).

### Bug N5 — LmStudioHttpClient timeout + offline fallback

- **Status.** Correct today; BC-037 locks behaviour. No fix.

---

## 6. Coverage map (BC → Agent)

Exactly one owner per BC, or an explicit split.

| BC     | Owner(s)                                                                                   | Phase                                   |
|--------|--------------------------------------------------------------------------------------------|-----------------------------------------|
| BC-001 | Backend (stabilise build path) + Swift (inject)                                            | 1 + 2-Swift                             |
| BC-002 | Frontend (electron OverlayWindow)                                                          | 2-Frontend                              |
| BC-003 | Frontend (electron TrayManager)                                                            | 2-Frontend                              |
| BC-004 | Frontend (Dashboard + BrainLauncher) + Backend (session endpoint already present — verify) | 2-Frontend + 2-Backend E                |
| BC-005 | Backend                                                                                    | 2-Backend (C already green, write test) |
| BC-006 | Backend                                                                                    | 2-Backend                               |
| BC-007 | Swift                                                                                      | 2-Swift                                 |
| BC-008 | Backend E                                                                                  | 2-Backend                               |
| BC-009 | Backend E                                                                                  | 2-Backend                               |
| BC-010 | Backend (verify)                                                                           | 1 (verify)                              |
| BC-011 | Frontend                                                                                   | 2-Frontend                              |
| BC-012 | Backend (verify)                                                                           | 1 (verify)                              |
| BC-013 | Backend (verify)                                                                           | 2-Backend                               |
| BC-014 | Frontend                                                                                   | 2-Frontend                              |
| BC-015 | Frontend (UI cancel)                                                                       | 2-Frontend B                            |
| BC-016 | Backend (reconciliation)                                                                   | 1                                       |
| BC-017 | Backend B (checkpoint)                                                                     | 2-Backend                               |
| BC-018 | Frontend                                                                                   | 2-Frontend                              |
| BC-019 | Frontend                                                                                   | 2-Frontend                              |
| BC-020 | Frontend                                                                                   | 2-Frontend                              |
| BC-021 | Backend (verify)                                                                           | 2-Backend                               |
| BC-022 | Backend B (endpoint) + Frontend B (modal)                                                  | 2-Backend + 2-Frontend                  |
| BC-023 | Frontend                                                                                   | 2-Frontend                              |
| BC-024 | Backend (verify)                                                                           | 2-Backend                               |
| BC-025 | Backend B (endpoints) + Frontend B (tab buttons)                                           | 2-Backend + 2-Frontend                  |
| BC-026 | documented-only (manual E2E on user's Mac)                                                 | —                                       |
| BC-027 | Backend (seeding correctness)                                                              | 1                                       |
| BC-028 | Backend (verify)                                                                           | 2-Backend                               |
| BC-029 | Backend B (duplicate endpoint)                                                             | 2-Backend                               |
| BC-030 | Backend E                                                                                  | 2-Backend                               |
| BC-031 | Backend (verify)                                                                           | 2-Backend                               |
| BC-032 | Frontend                                                                                   | 2-Frontend                              |
| BC-033 | Backend E (scan) + Frontend E (dialog)                                                     | 2-Backend + 2-Frontend                  |
| BC-034 | Backend (URL + filename + download service + SSE channel)                                  | 1                                       |
| BC-035 | Frontend                                                                                   | 2-Frontend                              |
| BC-036 | Backend (verify)                                                                           | 2-Backend                               |
| BC-037 | Backend (verify)                                                                           | 2-Backend                               |
| BC-038 | Frontend                                                                                   | 2-Frontend                              |
| BC-039 | Backend C (RagService + sqlite-vec + endpoints) + Frontend C (RagChat) + Python (embed)    | 2-Backend + 2-Frontend + 2-Python       |
| BC-040 | Frontend B                                                                                 | 2-Frontend                              |
| BC-041 | Frontend B                                                                                 | 2-Frontend                              |
| BC-042 | Backend (LogsController rewrite)                                                           | 1                                       |
| BC-043 | Backend (Serilog config check)                                                             | 1                                       |
| BC-044 | Backend (verify)                                                                           | 2-Backend                               |
| BC-045 | Backend (verify)                                                                           | 2-Backend                               |
| BC-046 | Frontend                                                                                   | 2-Frontend                              |
| BC-047 | Frontend                                                                                   | 2-Frontend                              |
| BC-048 | Backend D                                                                                  | 2-Backend                               |
| BC-049 | Backend D                                                                                  | 2-Backend                               |
| BC-050 | Frontend D                                                                                 | 2-Frontend                              |
| BC-051 | Backend (value comparers)                                                                  | 1                                       |
| BC-052 | Backend (log dedup + Kestrel)                                                              | 1                                       |
| BC-053 | Frontend B (typography + perf)                                                             | 2-Frontend                              |

Every BC has exactly one primary owner (multi-stack BCs list both owners and exactly one BC-split note in the per-agent
spec).

---

## 7. Reverse index — D-point / bug → BC (unchanged)

- **D-1** BC-004, BC-041. **D-2** BC-041, BC-053. **D-3** BC-002 (motion). **D-4** BC-053. **D-5** BC-053. **D-6**
  BC-053. **D-7** BC-004. **D-8** BC-004. **D-9** BC-015. **D-10** BC-041. **D-11** BC-032, BC-035. **D-13** BC-004 (
  focus ring). **D-14** BC-036..BC-039. **D-15.a** BC-001, BC-004. **D-15.b** BC-027..BC-031. **D-15.c** BC-053. *
  *D-15.d** BC-040, BC-041.
- **ADR-005 RAG** BC-039. **ADR-003 Syncthing** BC-048..BC-050. **ADR-004 R4** BC-008. **ADR-004 R5** BC-009.
- **Bugs** 1 → 34. 2 → 34, 001. 3 → 004. 4 → 022. 5 → 039. 6 → 049. 7 → 051. 8 → 052. 9 → 042. 10 → 027 / 052. 11 → 052.
  12 → 002, 003. 13 → 053. 14 → 033. 16 → 041. 17 → 039. 18 → 053. 19 → 015. 20 → 016. 21 → 017. 22 → 025. 23 → 050.
  24 → 053. 25 → 040. 26 → 034.
- **Directive LogsEndpoints → LogsController:** BC-042 (Phase 1).

---

## 8. References (load-bearing files only)

**Backend**

- `backend/src/Mozgoslav.Api/Program.cs`
- `backend/src/Mozgoslav.Api/Endpoints/*.cs` (Minimal API modules)
- `backend/src/Mozgoslav.Api/Controllers/LogsController.cs` (new, Phase 1)
- `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs`
-
`backend/src/Mozgoslav.Application/Services/{DictationSessionManager, LlmChunker, MarkdownGenerator, CorrectionService}.cs`
- `backend/src/Mozgoslav.Application/Rag/*` (restored, Backend MR C)
- `backend/src/Mozgoslav.Application/Interfaces/*` (see `ADR-007-phase2-backend.md`)
-
`backend/src/Mozgoslav.Infrastructure/Services/{Whisper, Llm, LmStudio, Syncthing, Ffmpeg, BackupService, EfAppSettings, IdleResourceCache}.cs`
- `backend/src/Mozgoslav.Infrastructure/Rag/*` (restored, Backend MR C — `sqlite-vec`)
- `backend/src/Mozgoslav.Infrastructure/Seed/{DatabaseInitializer, SyncthingVersioningVerifier}.cs`
- `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs`
- `backend/src/Mozgoslav.Infrastructure/Platform/AppPaths.cs`
- `backend/tests/Mozgoslav.Tests/*`, `backend/tests/Mozgoslav.Tests.Integration/*`

**Frontend**

- `frontend/src/App.tsx`, `frontend/src/main.tsx`
-
`frontend/src/features/{Dashboard, Queue, Notes, Obsidian, Onboarding, Settings, Models, Logs, Backups, Profiles, RecordingList, CommandPalette, SyncPairing}/*`
- `frontend/src/features/RagChat/*` (restored, Frontend MR C)
- `frontend/src/features/Sync/*` (new, Frontend MR D)
- `frontend/src/components/{Layout, BrainLauncher, Modal, Button, Input, ProgressBar, Card, Badge, EmptyState}/*`
- `frontend/src/styles/{theme, motion, liquidGlass, mixins, GlobalStyle}.ts`
- `frontend/src/api/{BaseApi, ApiFactory, MozgoslavApi, RecordingApi, SettingsApi}.ts`
- `frontend/src/store/slices/recording/*`, `.../rag/*` (restored), `.../sync/*` (restored)
- `frontend/src/constants/{api, routes}.ts`

**Electron main** — `frontend/electron/{main, preload}.ts`, `frontend/electron/dictation/*`,
`frontend/electron/utils/{backendLauncher, syncthingLauncher}.ts`.

**Swift helper** — `helpers/MozgoslavDictationHelper/Sources/*`,
`helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/*`.

**Python sidecar** — `python-sidecar/app/{main, config, routers, models, services}/*.py`,
`python-sidecar/app/routers/embed.py` (restored).

**Docs & ops** — `README.md`, `docs/README.md`, `docs/sync-conflicts.md` (to be restored), `CLAUDE.md` (root +
per-stack).
