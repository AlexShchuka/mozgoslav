# ADR-007: Iteration 7 — Scope, Business Cases & Test Plan

- **Status:** Accepted (decisions locked with shuka 2026-04-17).
- **Date:** 2026-04-17.
- **Supersedes:** none.
- **Related:** ADR-001..006 (archived at `.archive/adrs/`).
- **Execution plan:** `ADR-007-execution-plan.md` (sibling file — agent prompts + wave order).
- **Base branch reviewed:** `origin/shuka/adr-006-ux-lm-studio-v2 @ 4cefb4be3e4dc4e3bccb64b78be9820e68558c84`.

## 0. Resolutions (canonical — all decisions that govern Iteration 7)

### 0.1 Scope for Iteration 7 (merge order A → C → B → D → E)

| Order  | Candidate                       | Content                                                                                                                                                                                                                                |
|--------|---------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1st MR | **A — Stability + correctness** | Mandatory build-fix (N1 IDISP in `FfmpegAudioRecorder`), critical runtime bugs (2, 6, 7, 8, 9, 10, 11, 19, 20), LogsEndpoints → `LogsController` MVC rewrite (user directive — Minimal API exits Logs). Unblocks everything else.      |
| 2nd MR | **C — RAG production restore**  | Restore `IRagService` + `sqlite-vec` vector index + multilingual embeddings via Python sidecar `/embed` + `POST /api/search/ask` with citations. Full-page RagChat UX (Meetily Summary layout + AnythingLLM-style subtle animations).  |
| 3rd MR | **B — UX coherence pass**       | Typography bump (bug 41/16), top-bar spacing (18), Back-button polish (16), queue cancel UI affordance (19), Get-Started mandatory gating with subtle grey Skip (25), model-download progress bar (26), Obsidian first-class tab (22). |
| 4th MR | **D — Syncthing full restore**  | `SyncthingLifecycleService` + versioning verifier + SSE + full `SyncEndpoints` + Sync redux + SyncPairing feature + **first-class Sync tab** (bug 23). Random local port (fixes bug 6 as byproduct).                                   |
| 5th MR | **E — Dictation reliability**   | Dashboard record button end-to-end (3), folder-pick + `.bin/.gguf` auto-detect (14), restore ADR-004 R4 `IdleResourceCache` and R5 crash-recovery PCM, N3 per-profile transcription prompt wiring.                                     |

### 0.2 Out of scope (explicitly deferred, not deleted)

- **Calendar / meeting autostart (ADR-006 D-series)** — deferred. Do NOT delete ADR-006 file or related scaffolding;
  feature moves to a later iteration. Blocker: robust native audio recorder.
- **Native Swift `AVAudioEngine` helper** — `FfmpegAudioRecorder` stays as long-term; fix IDISP issues and add coverage.
  Native helper is a later iteration.
- **Full `electron-builder --mac` packaging verification** — macOS-host-only, out of sandbox scope.
- **Arbitrary new LLM providers (Groq, xAI, OpenRouter)** — not requested; defer.
- **Real ML in Python sidecar** (diarization / gender / emotion / NER) — stubs only.
- **Dark-mode visual polish across Liquid Glass surfaces** — defer after the typography decision lands.
- **Multi-language transcription beyond RU/EN** — backend accepts any Whisper-supported code; UI limits to RU/EN.

### 0.3 Product defaults

| Decision                     | Resolution                                                                                                                                                                                                                                                                                                                                                                                                      |
|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Default Whisper model source | **User-hosted `antony66` ggml on GitLab releases.** Best RU quality (WER 6.39%). `ModelCatalog[0].Url` points to the GitLab release asset. Attribution preserved in catalogue description.                                                                                                                                                                                                                      |
| Model catalogue paradigm     | **Folder-pick primary + URL download Advanced.** Onboarding's Models step defaults to folder-pick (drop `.bin` / `.gguf`, app detects and registers). URL-download catalogue under "Advanced". Progress bar required on URL downloads (bug 26). Restore `ModelDownloadService` + `POST /api/models/download` + SSE progress channel.                                                                            |
| `IAudioRecorder` strategy    | **Ffmpeg long-term.** Fix IDISP analyzer violations in `FfmpegAudioRecorder`; add unit + integration coverage with injected process abstraction. Native `AVAudioEngine` helper not pursued in Iteration 7.                                                                                                                                                                                                      |
| LLM provider default         | **`openai_compatible`** (LM Studio happy path). RagChat restored in 2nd MR routes through `LlmProviderFactory` → current provider → user's LM Studio endpoint.                                                                                                                                                                                                                                                  |
| Web API style                | **Minimal API everywhere EXCEPT Logs.** `LogsEndpoints.cs` is removed and rewritten as `LogsController : ControllerBase` ([ApiController], [Route("api/logs")]). Other endpoint modules stay Minimal API unless user extends the directive.                                                                                                                                                                     |
| C# class shape               | **No primary constructors.** Traditional ctors with explicit `readonly` fields. MR A audits existing branch code for primary-ctor usage and converts to traditional form. All new tests + new impl written in Wave 1 and beyond must follow this rule — `private readonly IFoo _foo; public Bar(IFoo foo) { _foo = foo; }`. Already in `backend/CLAUDE.md` conventions; re-stated here to close the audit loop. |

### 0.4 RAG — production quality

| Facet        | Choice                                                                                                                                                                                                                                                                   |
|--------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Vector index | **`sqlite-vec`** — actively maintained, embedded in existing SQLite, no new process.                                                                                                                                                                                     |
| Embeddings   | **Multilingual via Python sidecar `/embed` restored.** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (or equivalent ≤ 500 MB, multilingual, RU-capable). Deterministic SHA-256 BoW fallback for dev boxes without PyTorch. 384-dim L2-normalised output. |
| Citations    | Required in `POST /api/search/ask` response — `{answer, citations: [{noteId, segmentId, text, snippet}]}`.                                                                                                                                                               |
| Frontend     | Full-page `RagChat` — single surface, placeholder "Привет, введи сюда…", subtle enter/exit + typing-indicator animations (AnythingLLM-style). Layout inspiration: Meetily Summary. Replace bubble + "Ask" paradigm from commit `81afb1d`.                                |

### 0.5 Syncthing — ADR-003 fidelity + Sync tab

| Facet          | Choice                                                                                                                                                                                                                                                                    |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Lifecycle      | **Restore `SyncthingLifecycleService` (IHostedService).** Spawns bundled Syncthing binary with random free local port; API-key generated on first run, persisted to `settings.db`. Graceful shutdown via `POST /rest/system/shutdown`.                                    |
| Port / API-key | **Random local port + persistent API-key.** Fixes hardcoded `:8384` probe (bug 6).                                                                                                                                                                                        |
| Config         | Restore `SyncthingConfigService` — 3 folders with per-folder versioning per ADR-003 D4 (recordings staggered/30d; notes trashcan/30d; vault trashcan/14d). Restore `SyncthingVersioningVerifier` (ADR-004 R8). Restore ADR-004 R7 default `.stignore` templates.          |
| Endpoints      | Restore `GET /api/sync/status`, `/api/sync/health`, `/api/sync/pairing-payload`, `POST /api/sync/accept-device`, SSE bridge `GET /api/sync/events`.                                                                                                                       |
| Frontend       | `frontend/src/features/Sync/` — first-class tab. Sub-views: Devices (paired list + connection state), Folders (completion %, conflicts badge), Conflicts (file list — resolution manual via Finder), Settings toggles. `SyncPairing` pairing-modal reused as entry point. |

### 0.6 UX coherence — concrete deliverables

| Sub-item                              | Resolution                                                                                                                                                                                                                                                                                   |
|---------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Typography                            | Bump body-sm ≥ 14 px, revisit weights. Update `frontend/src/styles/theme.ts` tokens. Snapshot test locks ramp.                                                                                                                                                                               |
| Top-bar spacing (bug 18)              | Dashboard header padding + brain-launcher + product-name grid fixed so buttons don't overlap brand block.                                                                                                                                                                                    |
| Back button (bug 16)                  | Fonts bumped per typography. Icon replaced (pick in implementation).                                                                                                                                                                                                                         |
| Queue cancel UI (bug 19)              | Button wired in `frontend/src/features/Queue/*` for queued + in-flight states.                                                                                                                                                                                                               |
| Persistent queue (bug 20)             | Startup reconciliation — `Running` jobs flip to `Queued` (or `Failed` with reason).                                                                                                                                                                                                          |
| Queue resume from checkpoint (bug 21) | `Transcript.Segments` accumulate checkpoints at ~5-minute granularity; resume path reads last checkpoint.                                                                                                                                                                                    |
| Get-Started mandatory gating (bug 25) | Re-audit `frontend/src/features/Onboarding/*` state machine — each step gated on precondition (LLM ping OK; model file on disk or download completed; permissions granted). Optional steps expose subtle grey Skip (≤ 60% opacity of primary). Welcome step gets meaningful brand animation. |
| Model download progress bar (bug 26)  | SSE channel reusing `ChannelJobProgressNotifier` pattern or dedicated `/api/models/download/stream`. Frontend: progress + cancel affordance in Get-Started Models step AND Settings → Models.                                                                                                |
| Obsidian tab (bug 22)                 | `frontend/src/features/Obsidian/*` promoted to first-class tab. Buttons: "Sync all" (bulk-export un-exported `ProcessedNote` to vault) + "Разложить по PARA" (apply `FolderMapping` + `VaultExportRule` from ADR-001 — new endpoints required).                                              |

### 0.7 Test-writing execution (Wave 1)

- Base: **new branch `shuka/adr-007-tests` off `origin/main`**.
- Strategy: **4 parallel developer agents, one per stack** — backend C#, frontend TS, Python sidecar, Swift helper. All
  53 BCs from §4 land as red tests.
- Details: `ADR-007-execution-plan.md` Wave 1.

---

## 1. Context

Mozgoslav on branch `shuka/adr-006-ux-lm-studio-v2` is a macOS-first local second-brain app: Electron + React 19 +
Redux-Saga renderer ↔ ASP.NET Minimal API on .NET 10 (EF Core SQLite, Whisper.net, OpenAI SDK) ↔ FastAPI Python
sidecar (V3 ML stubs) ↔ Swift native helper for macOS AX injection + audio capture. Privacy-first (zero telemetry). The
branch introduced a UX + LLM-provider pass (D-1..D-15.d) but paid for it by removing entire feature surfaces (RAG
pipeline, Syncthing lifecycle + frontend, ADR-004 R4/R5 refinements, `ModelDownloadService`). The branch also does not
compile (3 IDISP analyzer errors in `FfmpegAudioRecorder` with `TreatWarningsAsErrors=true`). Iteration 7 restores what
was dropped (where user chose to restore it per §0), fixes what's broken, and lands the UX polish the user is waiting
for — all TDD-first per §4.

---

## 2. User business case catalogue

Format per case:

- **ID** | **Area** | **ADR refs**.
- **Business case** — one sentence, user-perspective.
- **Happy path** — bullets.
- **Edge / error** — bullets.
- **Out-of-scope for this BC** — bullets.

Coverage: 53 BCs spanning every retained ADR decision + every live bug + new Iteration-7 user asks. Reverse index after
the list maps bugs / D-points → BC IDs.

---

### Dictation (ADR-002, ADR-004 R1–R5)

**BC-001 | Dictation | ADR-002 D-all, ADR-004 R1/R3.** "I press mouse-5 anywhere, speak, release, and the text I spoke
appears in the currently focused app."

- Happy: Helper captures PCM 48 kHz chunks; backend `/api/dictation/start`→`/push`→`/stop`; Whisper.net streams
  partials; overlay shows partial text; on release, final text injects via AX; overlay fades.
- Edge: hotkey not permitted (Input Monitoring off) → tray shows error state, toast with deeplink to System Preferences;
  LLM polish off → raw text injects without LLM call; microphone permission denied → error, no session.
- Out-of-scope: Dashboard browser-side record button (see BC-004).

**BC-002 | Dictation | ADR-002 D8 + OverlayWindow.** "A small floating overlay near my cursor shows me what's being
transcribed in real time."

- Happy: Overlay appears at cursor, non-focusable, always-on-top; partials stream via SSE; overlay fades `FADE_MS` (500
  ms) after release.
- Edge: Overlay disabled in settings (`DictationOverlayEnabled=false`) → no overlay window; overlay stuck after error →
  must be forced-hidden on `error` phase.
- Out-of-scope: user clicking the overlay (deliberately non-focusable).

**BC-003 | Dictation | ADR-002 D6 + TrayManager.** "A menu-bar tray icon tells me whether dictation is idle /
recording / processing / failing."

- Happy: `TrayManager.setPhase()` swaps image per phase; fallback solid-colour 16×16 PNG guarantees a visible icon even
  without asset files.
- Edge: No `build/tray-<phase>.png` present → `buildFallbackIcon` produces a generated PNG; tray destroy on app quit.
- Out-of-scope: tray click-to-start (not implemented; tray menu exposes Quit only).

**BC-004 | Dictation | ADR-006 D-8.** "There's a big Brain button on the Dashboard that does the same thing as mouse-5 —
press to start, press to stop."

- Happy: `BrainLauncher` with 4-state machine; click → `/api/dictation/start` → state=`recording`; second click →
  `/api/dictation/stop/{id}`.
- Edge: state=`arming` or `stopping` → button disabled; start rejected (409) → toast, state back to `idle`; no audio was
  ever pushed → backend `StopAsync` returns an empty transcript.
- Out-of-scope: in-browser audio capture gap is addressed in MR E (Iteration 7 scope).

**BC-005 | Dictation | ADR-004 R1.** "My Whisper transcription knows my custom vocabulary."

- Happy: `DictationSessionManager.BuildInitialPrompt` joins `DictationVocabulary` into the Whisper `initial_prompt`.
- Edge: Empty vocabulary → returns `null`; duplicate terms deduped; whitespace trimmed.
- Out-of-scope: global dictionary across profiles.

**BC-006 | Dictation | ADR-004 R2.** "When I dictate into VS Code I get the code-profile; into Slack the
informal-profile; into Chrome the default."

- Happy: Bundle-id to profile-id map from `AppSettingsDto.DictationAppProfiles`.
- Edge: Unknown bundle-id → default profile; empty map → default. Helper `detectTarget` returns bundleId.
- Out-of-scope: runtime per-app profile *enforcement* in transcription (the settings-map design does not include a
  runtime selector — regression to fix in MR E).

**BC-007 | Dictation | ADR-004 R3.** "If AX injection times out, mozgoslav falls back to clipboard."

- Swift helper `inject.text` with `mode:"auto"`. AX fallback → clipboard paste with save/restore of prior clipboard.
- Edge: Permissions revoked mid-session → error surfaced; AX + clipboard both fail → return `ok:false` with reason.

**BC-008 | Dictation | ADR-004 R4.** "Whisper model releases RAM after a few minutes idle, to not keep 1.6 GB hot."

- **Gap today**: `IdleResourceCache<T>` was deleted — restore in MR E. `DictationModelUnloadMinutes` (default 10)
  triggers dispose; next call re-loads with 1-2 s latency.
- Edge: Re-entrant calls under load → keep factory warm; thread safety via `Interlocked`.

**BC-009 | Dictation | ADR-004 R5.** "If the app crashes mid-dictation, my audio buffer is on disk and I can recover
it."

- **Gap today**: crash-recovery PCM dump has no equivalent service registered — restore in MR E.
- Edge: Orphan temp files on startup → WARN log + path; manual recovery (no UI hook in Iteration 7).

---

### Recording & processing pipeline (ADR-001)

**BC-010 | Recording | ADR-001 §Pipeline.** "I drag an audio file onto the Dashboard, it is imported, transcribed,
summarized and exported to my Obsidian vault."

- Happy: Dashboard onDrop → `api.uploadFiles()` → `POST /api/recordings/upload` (multipart). `QueueBackgroundService`
  dequeues, runs `ProcessQueueWorker`. Progress SSE at `/api/jobs/stream`.
- Edge: Duplicate import (same sha256) → idempotent (`Recording.Sha256` unique index). Unsupported format → reject on
  upload.
- Out-of-scope: manual note creation (BC-022).

**BC-011 | Recording | ADR-001.** "I can import a folder of audio files by native file-picker."

- Happy: Dashboard `pickViaDialog` → `window.mozgoslav.openAudioFiles()` → `api.importByPaths`.
- Edge: User cancels picker → no-op.

**BC-012 | Recording | ADR-001.** "I can re-process a recording with a different profile."

- Happy: `POST /api/recordings/{id}/reprocess { profileId }`.
- Edge: Unknown profile → 404.

**BC-013 | Recording pipeline | ADR-001 §LLM.** "If my LLM endpoint is unreachable, I still get a raw transcript — just
no summary."

- Happy: `OpenAiCompatibleLlmService.ProcessAsync` → `LlmProvider.ChatAsync` catches exceptions and returns `""`;
  `LlmChunker.ParseOrRepair("")` returns `Empty`; pipeline continues.
- Edge: Partial JSON — `LlmChunker.ParseOrRepair` falls back to `Summary = rawContent.Trim()`.

**BC-014 | Queue | ADR-001.** "I can see every processing job in the Queue page with live progress."

- Happy: Queue subscribes to `/api/jobs/stream` SSE; initial list via `/api/jobs`.
- Edge: Empty state; backend offline → SSE reconnect.

**BC-015 | Queue | ADR-006 D-9.** "I can cancel a queued job; cancelling an in-flight job marks it Failed; cancelling a
finished job is rejected."

- Happy: `DELETE /api/queue/{id}` with 4 outcomes (204 / 200 / 409 / 404). UI cancel button.
- Edge: Cancel button disabled while the cancel request is in-flight.
- Out-of-scope: "dismiss from list" for already-Failed jobs.

**BC-016 | Queue | new in Iteration 7.** "If my machine crashes or I quit mid-process, the queue survives and my job
resumes from where it was, not from scratch."

- Resolution (MR A): startup reconciliation in `QueueBackgroundService` — `Running` jobs flip to `Queued` (or `Failed`
  with reason "app restarted").

**BC-017 | Queue | new in Iteration 7.** "For long files I get a checkpoint every ~5 minutes so resume is cheap."

- Resolution (MR B): `TranscriptCheckpoint` semantics — `Transcript.Segments` persist at ~5 min granularity; resume
  reads last checkpoint.

**BC-018 | Recording metadata | ADR-001.** "The recording list shows format, duration and status at a glance."

- Happy: Dashboard status badge by `ProcessingJob.Status`.
- Edge: Format string vs enum handled at render time; unknown status → `neutral` tone.

---

### Notes (ADR-001)

**BC-019 | Notes | ADR-001.** "I see a list of processed notes from past recordings."

- Happy: `NotesList` fetches `/api/notes`. Empty → EmptyState.

**BC-020 | Notes | ADR-001.** "I open a note and see the full summary, key points, decisions, action items, tags."

- Happy: `/api/notes/{id}` → `NoteViewer`.

**BC-021 | Notes | ADR-001.** "I can trigger a manual export of a note to my Obsidian vault."

- Happy: `POST /api/notes/{id}/export` via `MozgoslavApi.exportNote`.
- Edge: Vault path unset → 400.

**BC-022 | Notes | new in Iteration 7 (bug 4).** "I can create a manual note (not from a recording) — blank canvas or
templated."

- Resolution (MR B): `POST /api/notes` returns 201 + `ProcessedNote` stub with `Source=Manual`; UI: "Add Note" → modal
  with markdown editor.

---

### Obsidian export (ADR-001)

**BC-023 | Obsidian | ADR-001.** "I pick my vault folder once and the app knows where to export notes."

- Happy: Obsidian page pickVault → save to `settings.vaultPath`.

**BC-024 | Obsidian | ADR-001.** "I scaffold a default folder layout in my vault (Inbox / Projects / People / Topics /
Archive / Templates)."

- Happy: `POST /api/obsidian/setup { vaultPath }` → `ObsidianSetupService`. Idempotent create.

**BC-025 | Obsidian | new in Iteration 7 (bug 22).** "Obsidian is a first-class sidebar tab with two actions: 'Sync all
un-exported notes now' and 'Разложить по PARA'."

- Resolution (MR B): `POST /api/obsidian/export-all` (bulk-export) + `POST /api/obsidian/apply-layout` (FolderMapping +
  VaultExportRule from ADR-001 domain entities — add as plain records + migration if absent).

**BC-026 | Obsidian | ADR-003 companion.** "Notes exported into the vault are picked up by Obsidian (Syncthing-synced
vault) on my phone later."

- Depends on Syncthing path being functional (MR D).

---

### Profiles (ADR-001, ADR-004 R2)

**BC-027 | Profiles | ADR-001.** "I have three built-in profiles (Meeting / 1:1 / Idea-dump) I can read but not delete."

- Happy: `BuiltInProfiles.All` seeded at startup. `EfProfileRepository.DeleteAsync` refuses `IsBuiltIn=true`.
- Edge: Idempotent seeding.

**BC-028 | Profiles | ADR-006 D-15.b.** "I create a custom profile with my own system prompt, cleanup level, export
folder and auto-tags."

- Happy: `POST /api/profiles` via `MozgoslavApi.createProfile`.

**BC-029 | Profiles | ADR-006 D-15.b.** "I duplicate an existing profile to start from a clean copy."

- Resolution (MR B): explicit endpoint `POST /api/profiles/{id}/duplicate` if missing on branch.

**BC-030 | Profiles | ADR-006 D-15.b.** "Each profile can carry a `transcriptionPromptOverride` that feeds Whisper's
`initial_prompt` instead of the global vocabulary."

- Resolution (MR E): `DictationSessionManager.BuildInitialPrompt` prefers `profile.TranscriptionPromptOverride` over
  `DictationVocabulary`.

**BC-031 | Profiles | ADR-006 D-15.b.** "I delete a user-created profile; built-ins resist deletion."

- Covered in BC-027 edge. Tests: `Profiles_Delete_UserCreated_ReturnsNoContent`,
  `Profiles_Delete_BuiltIn_ReturnsConflict`.

---

### Models & downloads (ADR-001, ADR-006 D-11)

**BC-032 | Models | ADR-006 D-11.** "The Models page is read-only: it shows what's on disk, no download buttons —
downloads happen in LM Studio." (Catalogue-URL download path restored separately as Advanced — see BC-034.)

- Happy: `ModelEndpoints` returns catalogue + installed status; Models page renders cards.

**BC-033 | Models | new (bug 14).** "I drop a .bin or .gguf Whisper/VAD model file into a folder and the app detects it
automatically."

- Resolution (MR E): `GET /api/models/scan?dir=<path>` returns `[{path,filename,size,kind}]`; electron IPC
  `dialog:openModelFile` with `.bin`/`.gguf` filter; Settings + Onboarding Models step wire this up.

**BC-034 | Models | bugs 1+2.** "The default Whisper model is reachable — either a working URL (GitLab-hosted antony66
ggml), or detected locally."

- Resolution (MR A): update `ModelCatalog[0].Url` → GitLab release URL; align `AppPaths.DefaultWhisperModelPath`
  filename with catalogue entry filename. Restore `ModelDownloadService` + `POST /api/models/download` + SSE progress
  channel (used by Advanced flow).

**BC-035 | Models | ADR-006 D-11.** "LM Studio Suggested catalogue has 5 curated rows with one-click open-in-LM-Studio
deeplinks."

- Happy: `LmStudioEndpoints.Suggested` hard-coded array; UI opens `lmstudio://...` deeplinks.

---

### LLM provider (ADR-006 D-14)

**BC-036 | LLM | ADR-006 D-14.** "I pick 'OpenAI-compatible / Anthropic / Ollama' as provider, set endpoint + model +
key, and everything routes correctly."

- Happy: `LlmProviderFactory.GetCurrentAsync` returns selected provider. Default `openai_compatible`.

**BC-037 | LLM | ADR-006 D-14.** "LM Studio reachability badge in Settings tells me if the server is up."

- Happy: `Settings` swaps copy on `lmDiscovery.reachable`. `LmStudioHttpClient.ListModelsAsync` catches
  `HttpRequestException` and returns `Reachable:false`.
- Edge: Timeout 3 s.

**BC-038 | LLM | ADR-006 D-14.** "I pick a loaded LM Studio model from the discovery list; the app remembers my pick."

- Happy: Settings row click → `update("llmModel", model.id)`.

**BC-039 | LLM | ADR-005 + D-14.** "When I ask a question over my notes, the answer comes back grounded with citations."

- Resolution (MR C): restore full RAG pipeline per §0.4. Full-page RagChat UX.

---

### Settings & onboarding (ADR-006 D-15.d)

**BC-040 | Onboarding | ADR-006 D-15.d.** "On first run I go through Welcome → Models → Obsidian → LLM → Syncthing →
Mic → AX → Input-Monitoring → Ready."

- Happy: 9-step state machine. `markComplete` writes `onboardingComplete=true`.
- Edge: Skip is available per step (grey, subordinate per §0.6). Re-entry via Settings.

**BC-041 | Onboarding | new (bug 16).** "Back / Skip / Next controls look and feel equally substantial — not pale ghost
buttons next to a bold primary."

- Resolution (MR B): typography bump; Back `variant="secondary"`; Skip grey with ≤ 60% opacity vs primary.

---

### Logs (ADR-001)

**BC-042 | Logs | ADR-001 §Observability.** "I open the Logs page and see the tail of the current day's mozgoslav log."

- Happy: Logs page calls `api.tailLog(undefined, 400)`. Backend `LogsController` (MVC, rewritten per §0.3) exposes
  `GET /api/logs` and `GET /api/logs/tail?file=&lines=`.
- Edge: No log files → empty state.

**BC-043 | Logs | ADR-001.** "Logs rotate daily, last 14 retained, past entries still browsable via file picker on the
page."

- Happy: Serilog config `RollingInterval.Day`, `retainedFileCountLimit:14`.

---

### Backups (ADR-001 §Backup)

**BC-044 | Backups | ADR-001.** "I take a one-click SQLite backup to `AppPaths.Root/backups`."

- Happy: `BackupService.CreateAsync`; `POST /api/backup/create`; `GET /api/backup` lists.

---

### Meetily import (ADR-001)

**BC-045 | Meetily import | ADR-001 §Import.** "I import my existing Meetily SQLite database and all its
recordings/transcripts become mozgoslav recordings."

- Happy: `POST /api/meetily/import { meetilyDatabasePath }` → `MeetilyImporterService`.

---

### Health (ADR-001)

**BC-046 | Health | ADR-001.** "The sidebar shows an online/offline dot for the backend."

- Happy: `useBackendHealth` ping every 5 s.

**BC-047 | Health | ADR-001.** "I can force a one-shot LLM reachability check from Settings."

- Happy: Settings `checkLlm` → `/api/health/llm` → toast.

---

### Syncthing (ADR-003 + bugs 6, 23)

**BC-048 | Sync | ADR-003 D3.** "Mozgoslav reports Syncthing status (folders + devices) when the binary is running."

- Happy: `/api/sync/status` via `ISyncthingClient`. `SyncthingHttpClient` hits `/rest/config/folders`,
  `/rest/db/status?folder=`, `/rest/system/connections`.
- Edge: Syncthing unreachable → 503 JSON `{ error:"syncthing-unavailable" }`.

**BC-049 | Sync | ADR-003 D3 + bug 6.** "On first boot mozgoslav spawns the bundled Syncthing binary on a random port +
api-key, doesn't hammer :8384 before it's up."

- Resolution (MR D): `SyncthingLifecycleService` + random port + API-key.

**BC-050 | Sync | new (bug 23).** "Sync is a first-class sidebar tab with paired devices, folder % completion, conflicts
and toggles."

- Resolution (MR D): `frontend/src/features/Sync/*`. SyncPairing pairing modal reused.

---

### Tech debt (tested to the same bar)

**BC-051 | Tech debt | bug 7.** "No EF Core value-comparer warnings at startup."

- Resolution (MR A): `MozgoslavDbContext.OnModelCreating` adds `.Metadata.SetValueComparer(...)` on 8 list properties.

**BC-052 | Tech debt | bug 8.** "No duplicated 'SQLite schema ensured' / 'Seeded 3 built-in profiles' log lines on boot;
no Kestrel 'Overriding address(es)' WRN."

- Resolution (MR A): remove duplicate host config (`appsettings.json` `Urls` xor `ConfigureKestrel`), audit
  `DatabaseInitializer` scope vs singleton.

**BC-053 | Tech debt | user verdict 24.** "UI feels finished, not stub-like. Typography, spacing, affordances,
first-class tabs all coherent."

- Resolution (MR B): sum of typography + spacing + affordances + tabs deliverables in §0.6.

---

### Reverse index — D-point / bug → BC

- **D-1** BC-004, BC-041.
- **D-2** BC-041, BC-053.
- **D-3** BC-002 (motion).
- **D-4** BC-053.
- **D-5** BC-053 (lag component).
- **D-6** BC-053.
- **D-7** BC-004.
- **D-8** BC-004.
- **D-9** BC-015.
- **D-10** BC-041 (copy parity).
- **D-11** BC-032, BC-035.
- **D-13** BC-004 (focus ring).
- **D-14** BC-036, BC-037, BC-038, BC-039.
- **D-15.a** BC-001, BC-004.
- **D-15.b** BC-027..BC-031.
- **D-15.c** BC-053 (palette).
- **D-15.d** BC-040, BC-041.
- **ADR-005 RAG** BC-039 (restored).
- **ADR-003 Syncthing** BC-048, BC-049, BC-050.
- **ADR-004 R4 (idle unload)** BC-008.
- **ADR-004 R5 (crash recovery)** BC-009.
- **Bug 1** BC-034.
- **Bug 2** BC-034, BC-001.
- **Bug 3** BC-004.
- **Bug 4** BC-022.
- **Bug 5** BC-039.
- **Bug 6** BC-049.
- **Bug 7** BC-051.
- **Bug 8** BC-052.
- **Bug 9** BC-042.
- **Bug 10** BC-027 (profiles empty despite seed).
- **Bug 11** BC-052 (DB path consistency).
- **Bug 12** BC-002, BC-003.
- **Bug 13** BC-053 (render perf).
- **Bug 14** BC-033.
- **Bug 16** BC-041.
- **Bug 17** BC-039 (RagChat shape).
- **Bug 18** BC-053 (dashboard spacing).
- **Bug 19** BC-015.
- **Bug 20** BC-016.
- **Bug 21** BC-017.
- **Bug 22** BC-025.
- **Bug 23** BC-050.
- **Bug 24** BC-053.
- **Bug 25** BC-040 (Get-Started gating).
- **Bug 26** BC-034 (model download progress).
- **Directive** LogsEndpoints → LogsController: BC-042 (MR A).

---

## 3. Live bug catalogue (runtime-observed, verified in code)

Severity scale: **Blocker** (branch cannot ship) / **High** (core feature broken) / **Medium** (frequent friction) / *
*Low** (cosmetic, dev noise).

### Bug 1 — Default Whisper model URL 500s

- **Symptom.** `ModelCatalog[0]` URL (`Limtech/whisper-large-v3-russian-ggml`) returns HTTP 500.
- **Root cause.** External host. Also: `ModelDownloadService` deleted on branch; no download endpoint. Catalogue entry
  is decorative.
- **Severity.** High.
- **Evidence.** `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs:13-20`. Missing: `ModelDownloadService.cs`,
  `POST /api/models/download`.
- **Affected BCs.** BC-034, BC-001.
- **Fix MR.** A (user-hosted GitLab URL; restore download endpoint).

### Bug 2 — "Whisper model not configured or missing on disk"

- **Symptom.** `InvalidOperationException` at start of transcription: model file absent at
  `AppPaths.DefaultWhisperModelPath`.
- **Root cause.** Seeded `WhisperModelPath` → `ggml-large-v3-q8_0.bin`; catalogue default URL targets different filename
  `ggml-model-q8_0.bin`. Filename mismatch; no download endpoint to satisfy either path.
- **Severity.** Blocker for transcription.
- **Evidence.** `WhisperNetTranscriptionService.cs:163-173`, `AppSettingsDto.cs:44`, `AppPaths.cs:28-29`,
  `DatabaseInitializer.cs:64-69`, `ModelCatalog.cs:13-20`.
- **Affected BCs.** BC-034, BC-001, BC-010.
- **Fix MR.** A (align filenames + restore download + folder-pick path).

### Bug 3 — Record button doesn't record anything useful

- **Symptom.** Dashboard record button clickable; pressing it does not capture audio → no transcript.
- **Root cause.** `Dashboard.tsx:79-105` calls `api.startDictation()` / `api.stopDictation()` but never pushes audio.
  Audio-push path only in the Electron mouse-5 flow. Server-side session runs against an empty audio channel.
- **Severity.** Blocker for the D-8 claim.
- **Evidence.** `frontend/src/features/Dashboard/Dashboard.tsx:79-105`, `DictationSessionManager.cs:196-219`,
  `DictationEndpoints.cs:36-64`, `WhisperNetTranscriptionService.cs:163-173`.
- **Affected BCs.** BC-004.
- **Fix MR.** E (wire browser audio-push from renderer to `/api/dictation/push`).

### Bug 4 — No "Add Note" button in Notes UI

- **Symptom.** Notes page shows list + empty state only; no create-note affordance.
- **Root cause.** `NotesList.tsx` has no "new" button. No `POST /api/notes` endpoint.
- **Severity.** Medium.
- **Affected BCs.** BC-022.
- **Fix MR.** B (add endpoint + modal editor).

### Bug 5 — RagChat doesn't reach LM Studio

- **Symptom.** User types a question; nothing happens.
- **Root cause.** Entire RAG pipeline deleted on branch: `RagService`, adapters, vector indices, endpoint, frontend
  feature folder, redux slice. Agent-B report omitted this.
- **Severity.** Blocker (confirmed by user scope decision §0).
- **Affected BCs.** BC-039.
- **Fix MR.** C (full restoration per §0.4).

### Bug 6 — Syncthing REST probed at hardcoded :8384 pre-binary

- **Symptom.** Runtime log `GET http://127.0.0.1:8384/rest/system/status → Connection refused` on every boot.
- **Root cause.** `Program.cs:141-143` registers `SyncthingHttpClient` with fixed base `http://127.0.0.1:8384`. No
  `SyncthingLifecycleService` on branch.
- **Severity.** High (log spam + indicates ADR-003 core wiring absent).
- **Affected BCs.** BC-048, BC-049.
- **Fix MR.** D (restore lifecycle + random port). Spot-fix (guard) also in MR A to kill log spam earlier.

### Bug 7 — EF Core value-comparer warnings × 8

- **Symptom.** 8 startup WRNs on collection properties.
- **Root cause.** `OnModelCreating` attaches value converters without `.Metadata.SetValueComparer(...)` on
  `ProcessedNote.{KeyPoints, Decisions, ActionItems, UnresolvedQuestions, Participants, Tags}`, `Profile.AutoTags`,
  `Transcript.Segments`.
- **Severity.** Low (cosmetic + correctness trap).
- **Evidence.** `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs:32-145`.
- **Affected BCs.** BC-051.
- **Fix MR.** A.

### Bug 8 — Duplicate log lines + Kestrel "Overriding address(es)" WRN

- **Symptom.** `SQLite schema ensured` × 3, `Seeded 3 built-in profiles` × 3, Kestrel Urls WRN.
- **Root cause.** Double endpoint config: `appsettings.json:11 Urls` + `Program.cs:48 ConfigureKestrel`. Triple-log
  likely `DatabaseInitializer` (singleton) + scoped `IProfileRepository` scope materialisation per `AddAsync`.
- **Severity.** Low.
- **Fix MR.** A.

### Bug 9 — Logs page empty

- **Symptom.** Logs UI always empty.
- **Root cause (hypothesis).** Path mismatch — Serilog writes to `AppPaths.Logs`; `LogsEndpoints.cs` scans a different
  path. Also: user directive — LogsEndpoints rewritten as `LogsController` in MR A.
- **Severity.** Medium.
- **Fix MR.** A (rewrite + path alignment).

### Bug 10 — Profiles page empty despite seed log

- **Symptom.** UI at `/profiles` empty though backend logs "Seeded 3 built-in profiles".
- **Root cause hypothesis.** DB path mismatch — seeding writes one `.db`, UI reads another; OR deserialisation broken
  post `models → types` rename.
- **Severity.** Blocker for Profiles UX.
- **Fix MR.** A.

### Bug 11 — DB path / seed / migration suspicion

- **Root cause.** General framing of bugs 9+10. Also env-var override `Mozgoslav__DatabasePath` may shadow
  `AppPaths.Database`.
- **Fix MR.** A (confirm single path, add startup log of actual DB location).

### Bug 12 — Tray icon missing; overlay hangs non-clickable

- **Symptom.** No tray icon; overlay visible but non-clickable.
- **Root cause.** Overlay `focusable:false` is intentional per ADR-002 D8 — expectation gap, not a bug of the overlay.
  Tray missing likely `process.resourcesPath` mismatch dev vs packaged, or helper-init exception before tray built.
- **Severity.** High (tray) + Medium (overlay expectation).
- **Fix MR.** E (audit `TrayManager` init, fallback PNG path, document overlay intent in Settings).

### Bug 13 — Frontend lag

- **Root cause hypotheses.** (a) Liquid Glass `backdrop-filter` on sidebar without verified `@supports not`; (b) no
  virtualisation on Queue/Notes lists.
- **Severity.** Medium.
- **Fix MR.** B (virtualisation + `@supports` check + Queue render perf).

### Bug 14 — No folder-picker + auto-detect for .bin / .gguf

- **Symptom.** User can't drop a local file + have app detect.
- **Root cause.** `Settings.pickWhisperFile` uses audio-filter picker; no `openModelFile` IPC handler; no scan endpoint.
- **Severity.** Medium.
- **Fix MR.** E (backend scan endpoint + electron IPC + Settings/Onboarding UI).

### Bug 15 — Agent-B self-admission: nothing verified at runtime

- **Severity.** Blocker (expressed by N1 below).
- **Fix MR.** A (build green) + all waves (tests per §4).

### Bug 16 — Onboarding Back button + overall typography too delicate

- **Fix MR.** B (typography bump + Back secondary variant + icon replacement).

### Bug 17 — RagChat UX wrong shape

- **Fix MR.** C (full-page single-surface chat; Meetily + AnythingLLM references).

### Bug 18 — Top-of-Dashboard spacing

- **Fix MR.** B (header padding + grid rework).

### Bug 19 — Queue cancel button missing from UI despite D-9 ✅

- **Fix MR.** A (frontend cancel affordance wired to existing backend).

### Bug 20 — Queue must persist across app launches

- **Fix MR.** A (startup reconciliation `Running → Queued`/`Failed`).

### Bug 21 — Queue resume from checkpoint (~5 min)

- **Fix MR.** B (`Transcript.Segments` checkpoint persistence + resume path).

### Bug 22 — Dedicated Obsidian tab

- **Fix MR.** B (first-class tab + Sync all + Разложить по PARA endpoints).

### Bug 23 — Dedicated Sync tab

- **Fix MR.** D (first-class tab + full SyncPairing + devices/folders/conflicts views).

### Bug 24 — UX verdict "doesn't reflect product vision"

- **Fix MR.** B (sum of typography, tabs, affordances, animations).

### Bug 25 — Mandatory Get-Started gating with subtle grey Skip

- **Fix MR.** B (onboarding state machine gated on preconditions, muted Skip).

### Bug 26 — Model download progress bar

- **Fix MR.** A (backend SSE channel) + B (frontend component).

### Bug N1 — Solution does not build (IDISP on `FfmpegAudioRecorder`)

- **Symptom.** `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` fails with 3 analyzer errors (`IDISP006` +
  2× `IDISP003`) — `TreatWarningsAsErrors=true` promotes them.
- **Evidence.** `backend/src/Mozgoslav.Infrastructure/Services/FfmpegAudioRecorder.cs:22-102`.
- **Severity.** Blocker (gate on every subsequent MR).
- **Fix MR.** A (first commit).

### Bug N2 — Frontend Queue perf on large lists

- **Symptom.** Re-render storm possible on ≥ 100 queue rows (no virtualisation).
- **Fix MR.** B (virtualise; perf test BC-053).

### Bug N3 — Profile `transcriptionPromptOverride` not wired to Whisper

- **Symptom.** Field persists but Whisper receives only `DictationVocabulary`.
- **Fix MR.** E (prefer profile override in `BuildInitialPrompt`).

### Bug N4 — Dual LLM surface (`ILlmService` legacy + `ILlmProvider` new)

- **Symptom.** Both registered; legacy delegates to factory. Acceptable today but a future consolidation target.
- **Severity.** Low.
- **Fix MR.** Deferred (out of Iteration 7 scope).

### Bug N5 — LmStudioHttpClient timeout + offline fallback

- **Symptom.** OK today — `ListModelsAsync` catches `HttpRequestException` and returns `Reachable:false`; 3-s timeout
  configured.
- **Severity.** Low (noted as correct; no fix needed; BC-037 locks behaviour).

---

## 4. Test plan catalogue (strictly per §2 business cases)

### 4.1 Coverage matrix

One row per BC. Columns: **BC** = id; **Stack** = backend / frontend / electron / swift / sidecar; **Type** = unit /
integration / e2e; **TC** = TestContainers; **Red-first** = can be written to fail now with no impl changes; **Target
path / class.method**.

| BC     | Stack                        | Type               | TC                                  | Red-first?                 | Target path / class.method                                                                                                                                                                                       |
|--------|------------------------------|--------------------|-------------------------------------|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| BC-001 | electron + backend           | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/DictationEndpointsTests.cs::Dictation_FullLoop_WithPushedChunks_ReturnsTranscript` + electron harness later                                                           |
| BC-002 | electron                     | unit               | no                                  | yes                        | `frontend/__tests__/electron/OverlayWindow.test.ts::Overlay_Position_ClampsToDisplay`                                                                                                                            |
| BC-003 | electron                     | unit               | no                                  | yes                        | `frontend/__tests__/electron/TrayManager.test.ts::Tray_Fallback_RendersPngWhenAssetMissing`                                                                                                                      |
| BC-004 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx::Dashboard_RecordButton_IdleToRecording`                                                                                                           |
| BC-005 | backend                      | unit               | no                                  | yes                        | `backend/tests/Mozgoslav.Tests/Application/DictationSessionManagerTests.cs::BuildInitialPrompt_JoinsVocabularyTerms`                                                                                             |
| BC-006 | backend                      | unit               | no                                  | yes                        | `backend/tests/Mozgoslav.Tests/Application/PerAppProfileSelectionTests.cs::Select_BundleInMap_ReturnsProfileId`                                                                                                  |
| BC-007 | swift                        | unit               | no                                  | yes                        | `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift::AxTimeout_FallsBackToCgEvent`                                                                                     |
| BC-008 | backend                      | unit               | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests/Infrastructure/IdleResourceCacheTests.cs` (restore)                                                                                                                               |
| BC-009 | backend                      | integration        | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/DictationCrashRecoveryTests.cs::CrashMidSession_PcmBufferPersistsOnDisk`                                                                                              |
| BC-010 | backend                      | integration        | TC: WireMock for LLM                | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ApiEndpointsTests.cs::Recording_Import_Upload_ProcessingEndToEnd` (extend)                                                                                            |
| BC-011 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx::Dashboard_PickViaDialog_ImportsByPaths`                                                                                                           |
| BC-012 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ApiEndpointsTests.cs::Recording_Reprocess_EnqueuesNewJob`                                                                                                             |
| BC-013 | backend                      | unit               | no                                  | yes                        | `backend/tests/Mozgoslav.Tests/Application/OpenAiCompatibleLlmServiceTests.cs::Process_LlmUnreachable_ReturnsEmpty`                                                                                              |
| BC-014 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Queue/__tests__/Queue.test.tsx::Queue_SseSubscription_MergesJobs`                                                                                                                         |
| BC-015 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ApiEndpointsTests.cs::Queue_Delete_*` (4 tests — verify compile)                                                                                                      |
| BC-016 | backend                      | integration        | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/QueueStartupReconciliationTests.cs::StuckRunning_OnStartup_FlipsToQueued`                                                                                             |
| BC-017 | backend                      | integration        | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/TranscriptCheckpointTests.cs::LongAudio_Checkpoints_EveryNSeconds_ResumesFromLast`                                                                                    |
| BC-018 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Dashboard/__tests__/Dashboard.test.tsx::Dashboard_FormatLabel_HandlesEnumAndString`                                                                                                       |
| BC-019 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Notes/__tests__/NotesList.test.tsx::NotesList_EmptyState`                                                                                                                                 |
| BC-020 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Notes/__tests__/NoteViewer.test.tsx`                                                                                                                                                      |
| BC-021 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ApiEndpointsTests.cs::Note_Export_ReturnsUpdatedVaultPath`                                                                                                            |
| BC-022 | backend + frontend           | integration + unit | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/NoteManualCreateTests.cs::Post_Notes_CreatesManualNote_ReturnsCreated201` + `frontend/src/features/Notes/__tests__/NotesList.test.tsx::NotesList_AddNote_OpensEditor` |
| BC-023 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx::Obsidian_VaultPicker_SavesSettings`                                                                                                                 |
| BC-024 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ObsidianSetupTests.cs::Setup_CreatesPresetFolders_Idempotent`                                                                                                         |
| BC-025 | backend + frontend           | integration + unit | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/ObsidianBulkExportTests.cs::PostNotes_ExportAll_ReturnsCount` + `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx::Obsidian_SyncAll_CallsBulkExport`        |
| BC-026 | out-of-sandbox               | e2e                | —                                   | manual                     | documented-only                                                                                                                                                                                                  |
| BC-027 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/BuiltInProfilesTests.cs::Seeding_AddsThreeProfiles_IdempotentOnRestart` (extend)                                                                                      |
| BC-028 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/ApiEndpointsTests.cs::Profile_Create_ReturnsWithGeneratedId`                                                                                                          |
| BC-029 | backend                      | integration        | no                                  | yes (red)                  | `Profile_Duplicate_ReturnsNewProfileMinusId`                                                                                                                                                                     |
| BC-030 | backend                      | unit               | no                                  | yes (red)                  | `DictationSessionManagerTests.cs::BuildInitialPrompt_PrefersProfileOverride_OverVocabulary`                                                                                                                      |
| BC-031 | backend                      | integration        | no                                  | yes                        | `ApiEndpointsTests.cs::Profile_Delete_UserCreated_ReturnsNoContent` + `Profile_Delete_BuiltIn_ReturnsConflict`                                                                                                   |
| BC-032 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Models/__tests__/Models.test.tsx::Models_RenderCards_NoDownloadButtons`                                                                                                                   |
| BC-033 | backend + electron           | integration + unit | no                                  | yes (red)                  | `backend/tests/Mozgoslav.Tests.Integration/ModelScanEndpointTests.cs::Scan_ReturnsBinAndGgufFiles` + `frontend/__tests__/electron/main-dialog.test.ts::Dialog_OpenModelFile_FiltersBinGguf`                      |
| BC-034 | backend                      | integration        | TC: WireMock HF                     | yes                        | `ModelDefaultChainTests.cs::Default_WhenFilePresent_NoExceptionOnTranscribe` + `Default_WhenUrlFails_SurfacesUserActionableError`                                                                                |
| BC-035 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Settings/__tests__/Settings.test.tsx::Settings_LmStudio_SuggestedRendered`                                                                                                                |
| BC-036 | backend                      | integration        | TC: WireMock                        | yes                        | `backend/tests/Mozgoslav.Tests.Integration/LlmProviderFactoryTests.cs::Factory_SwitchesOnSetting`                                                                                                                |
| BC-037 | backend                      | unit               | no                                  | yes                        | `backend/tests/Mozgoslav.Tests/Infrastructure/LmStudioHttpClientTests.cs::List_WhenOffline_ReturnsReachableFalse`                                                                                                |
| BC-038 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Settings/__tests__/Settings.test.tsx::Settings_LmStudio_UseModel_UpdatesSettings`                                                                                                         |
| BC-039 | backend + frontend + sidecar | integration + unit | TC: WireMock LLM                    | yes (red)                  | `RagService` integration + `RagChat.test.tsx` + sidecar `test_embed.py`                                                                                                                                          |
| BC-040 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Onboarding/__tests__/Onboarding.test.tsx::Onboarding_Walkthrough_FinishWritesFlag`                                                                                                        |
| BC-041 | frontend                     | unit / snapshot    | no                                  | yes (red on current theme) | `frontend/__tests__/styles/Theme.test.ts::Typography_sm_gte_14px`                                                                                                                                                |
| BC-042 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/LogsControllerTests.cs::Tail_Default_ReturnsLines` (Controller, not Endpoints)                                                                                        |
| BC-043 | backend                      | unit               | no                                  | yes                        | `backend/tests/Mozgoslav.Tests/Infrastructure/SerilogConfigurationTests.cs::DailyRollover_Retains14`                                                                                                             |
| BC-044 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/BackupEndpointTests.cs::Create_ReturnsArchivedPath`                                                                                                                   |
| BC-045 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/MeetilyImportTests.cs::Import_ValidDb_MigratesRecordings`                                                                                                             |
| BC-046 | frontend                     | unit               | no                                  | yes                        | `frontend/__tests__/hooks/useBackendHealth.test.ts::Poll_SwitchesToOffline_OnReject`                                                                                                                             |
| BC-047 | frontend                     | unit               | no                                  | yes                        | `frontend/src/features/Settings/__tests__/Settings.test.tsx::Settings_CheckLlm_ShowsToast`                                                                                                                       |
| BC-048 | backend                      | integration        | TC: syncthing container OR WireMock | yes                        | `backend/tests/Mozgoslav.Tests.Integration/Syncthing/SyncStatusEndpointTests.cs::Status_Mapped_FromRestResponses`                                                                                                |
| BC-049 | backend + electron           | integration        | TC: syncthing                       | yes (red)                  | `SyncthingLifecycleTests.cs::Lifecycle_SpawnsOnRandomPort_BackendReconfigures`                                                                                                                                   |
| BC-050 | frontend                     | unit               | no                                  | yes (red)                  | `frontend/src/features/Sync/__tests__/SyncTab.test.tsx::SyncTab_RendersFoldersAndDevices`                                                                                                                        |
| BC-051 | backend                      | integration        | no                                  | yes                        | `backend/tests/Mozgoslav.Tests.Integration/DbContextValueComparerTests.cs::Mutate_KeyPointsZero_IsDetectedByChangeTracker`                                                                                       |
| BC-052 | backend                      | integration        | no                                  | yes                        | `StartupLogTests.cs::SchemaEnsured_EmittedExactlyOnce`                                                                                                                                                           |
| BC-053 | frontend (visual / perf)     | snapshot + perf    | no                                  | partial                    | `frontend/__tests__/perf/Queue_100rows.test.tsx` + design review                                                                                                                                                 |

**Coverage summary.** 53 distinct BC rows; every BC has at least one test; every bug in §3 maps to at least one BC's
test.

### 4.2 Per-stack test layout (exact file paths)

**Backend C#**

- Unit: `backend/tests/Mozgoslav.Tests/<Layer>/<Class>Tests.cs` where `<Layer>` ∈
  `Domain | Application | Infrastructure | UseCases`. MSTest `[TestClass]`/`[TestMethod]` + FluentAssertions +
  NSubstitute.
- Integration: `backend/tests/Mozgoslav.Tests.Integration/<FeatureOrEndpoint>Tests.cs`. `ApiFactory` is the entry point.
  Temp SQLite via `TestDatabase`. WireMock.Net for outbound HTTP (LM Studio, Ollama, Anthropic, Syncthing REST).
  Testcontainers: `syncthing/syncthing:latest` for real REST contract (BC-048, BC-049); WireMock first preference
  elsewhere.

**Frontend**

- Feature tests co-located: `frontend/src/features/<Feature>/__tests__/<File>.test.tsx`.
- Electron main-process tests: `frontend/__tests__/electron/<File>.test.ts` — mock `electron` via
  `jest.mock("electron")`.
- Theme / styles snapshot: `frontend/__tests__/styles/<Name>.test.ts`.
- Hooks: `frontend/__tests__/hooks/<Hook>.test.ts`.
- Perf: `frontend/__tests__/perf/<Scenario>.test.tsx`.

**Swift helper** — XCTest under `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/`. Run locally on
user's macOS host with `swift test`. Sandbox cannot run Swift — static-only in Wave 1.

**Python sidecar** — `python-sidecar/tests/test_<name>.py`. pytest + `fastapi.testclient.TestClient`.

### 4.3 Red-first contract

"Red-first" means: before any implementation agent touches impl code, the test must compile (C# / TS strict / Swift) or
import (Python) and must fail for the *right* reason — missing symbol, missing endpoint route, specific assertion
mismatch — not an environment problem.

- **Backend unit**: missing method → compile error OK; impl agent adds.
- **Backend integration**: missing endpoint → `404` from `HttpClient` → assertion fails on body content; impl agent
  flips to green.
- **Frontend**: missing prop/action → type error at test-collect time; impl agent adds symbol.
- **Electron main**: mock `electron.Tray` / `electron.BrowserWindow` via jest module mocks; assert on method calls;
  missing wiring → `expected .build to be called`.
- **Swift**: XCTest assertion fail.
- **Python**: `TestClient.get(...)` → 404 / 500 → assertion fails; impl adds route.

Impl agent rule: no modifying tests beyond trivial fixture cleanup. If an assertion needs changing, escalate — do not
silently rewrite.

### 4.4 Fixture strategy

- **SQLite**: `TestDatabase` helper — temp file per test, `Dispose` cleans `.db / .db-wal / .db-shm`. Respect
  `ApiFactory.ReplaceDbContextRegistration` pattern.
- **HTTP mocks**: WireMock.Net for LM Studio (`/v1/models`, `/v1/chat/completions`), Anthropic (`/v1/messages`),
  Ollama (`/api/chat`), Obsidian REST, Syncthing REST (unit); real `syncthing/syncthing:latest` container in BC-048/049
  integration.
- **File system**: `Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"))` per test.
- **Swift helper**: electron client tests use fake stdio stream with canned newline-JSON — no real spawn.
- **Never hit real network.** HuggingFace / openai.com / Anthropic / your LM Studio endpoints — always mocked.

---

## 5. Non-goals (already in §0.2 — restated for discoverability)

- Calendar / meeting autostart (ADR-006 D-series).
- Native Swift `AVAudioEngine` helper.
- `electron-builder --mac` packaging run in sandbox.
- New LLM providers (Groq, xAI, OpenRouter).
- Real ML in Python sidecar (diarization, gender, emotion, NER).
- Dark-mode polish beyond current tokens.
- UI-exposed languages beyond RU/EN.

---

## 6. References

**Backend (load-bearing)**

- `backend/src/Mozgoslav.Api/Program.cs`
-

`backend/src/Mozgoslav.Api/Endpoints/{Dictation,Queue,Sync,Model,LmStudio,Profile,Recording,Note,Obsidian,Meetily,Backup,Sse}Endpoints.cs`

- `backend/src/Mozgoslav.Api/Controllers/LogsController.cs` (new, MR A)
- `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs`
-

`backend/src/Mozgoslav.Application/Services/{DictationSessionManager,LlmChunker,MarkdownGenerator,CorrectionService}.cs`

- `backend/src/Mozgoslav.Application/Rag/*` (restored, MR C)
-

`backend/src/Mozgoslav.Application/Interfaces/{AppSettingsDto,IAppSettings,ILlmProvider,ILlmProviderFactory,ILmStudioClient,IRagService,IEmbeddingService,IVectorIndex,ISyncthingClient,SyncthingEvent}.cs`
-
`backend/src/Mozgoslav.Infrastructure/Services/{Whisper,Llm,LmStudio,Syncthing,Ffmpeg,BackupService,EfAppSettings,IdleResourceCache}.cs`

- `backend/src/Mozgoslav.Infrastructure/Rag/{BagOfWords,InMemory,Sqlite,PythonSidecar}*.cs` (restored, MR C —
  sqlite-vec)
- `backend/src/Mozgoslav.Infrastructure/Seed/{DatabaseInitializer,SyncthingVersioningVerifier}.cs`
- `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs`
- `backend/src/Mozgoslav.Infrastructure/Platform/AppPaths.cs`
- `backend/tests/Mozgoslav.Tests/*`, `backend/tests/Mozgoslav.Tests.Integration/*` (Wave 1 adds files)

**Frontend**

- `frontend/src/App.tsx`, `frontend/src/main.tsx`
-

`frontend/src/features/{Dashboard,Queue,Notes,Obsidian,Onboarding,Settings,Models,Logs,Backups,Profiles,RecordingList,CommandPalette,SyncPairing}`

- `frontend/src/features/RagChat/*` (restored, MR C)
- `frontend/src/features/Sync/*` (new, MR D)
- `frontend/src/components/{Layout,BrainLauncher,Modal,Button,Input,ProgressBar,Card,Badge,EmptyState}`
- `frontend/src/styles/{theme,motion,liquidGlass,mixins,GlobalStyle}.ts`
- `frontend/src/api/{BaseApi,ApiFactory,MozgoslavApi,RecordingApi,SettingsApi}.ts`
- `frontend/src/store/{rootReducer,rootSaga,slices/recording}`
- `frontend/src/store/slices/rag/*` (restored, MR C)
- `frontend/src/store/slices/sync/*` (restored, MR D)
- `frontend/src/constants/{api,routes}.ts`

**Electron main**

- `frontend/electron/{main,preload}.ts`
-

`frontend/electron/dictation/{DictationOrchestrator,NativeHelperClient,TrayManager,HotkeyMonitor,OverlayWindow,PhaseSoundPlayer,types}.ts`

- `frontend/electron/utils/{backendLauncher,syncthingLauncher}.ts`

**Swift helper**

- `helpers/MozgoslavDictationHelper/Sources/{DictationHelperCore,MozgoslavDictationHelper}/*.swift`
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/*.swift`

**Python sidecar**

- `python-sidecar/app/{main,config,routers,models,services}/*.py`
- `python-sidecar/app/routers/embed.py` (restored, MR C)

**Docs & ops**

- `README.md`, `docs/README.md`, `docs/sync-mobile-setup.md`, `docs/sync-conflicts.md` (restored scope),
  `docs/bluetooth-playback-notice.md`, `CLAUDE.md` (root + per-stack)
- `.github/workflows/ci.yml`, `lefthook.yml`
- `scripts/{demo.command,fetch-syncthing.{sh,ps1}}`
- Sibling: `docs/adr/ADR-007-execution-plan.md`
