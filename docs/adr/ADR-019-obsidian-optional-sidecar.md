---
adr: 019
title: Obsidian as a decoupled optional sidecar — unified pipeline, connection check, turnkey onboarding
status: Proposed
date: 2026-04-23
priority: high
related: [ADR-007-shared, ADR-014, ADR-018]
authors: [shuka]
machine_readable: true
---

# ADR-019 — Obsidian as a decoupled optional sidecar

> Final home: `mozgoslav/docs/adr/ADR-019-obsidian-optional-sidecar.md`. This
> file is the draft surfaced to the user for review before it is committed to
> the mozgoslav repo on a fresh branch off `origin/main` (`1032449` at draft
> time).

## 1. GOAL

Deliver an Obsidian integration that:

- **G1. Is an optional sidecar.** The core ingest pipeline
  (`ProcessQueueWorker.ProcessNextAsync` → Whisper → LLM polish → note save)
  NEVER waits for, blocks on, or fails because of Obsidian. An unconfigured /
  missing / broken vault MUST NOT stall or fail note processing.
- **G2. Has one unified write pipeline.** A single port
  (`IVaultDriver`) owns every mutation to the vault (create folders, write
  notes, write templates, ensure bootstrap content). One driver, one code path,
  one failure-handling style. No silent "exported 0" return.
- **G3. Checks connectivity honestly.** One aggregated, cancellable,
  short-timeout `VaultDiagnosticsReport` covers: vault path valid + is an
  Obsidian vault, each mandatory plugin installed + enabled, Local REST API
  reachable (if enabled), template + user-scripts folders configured in
  Templater, embedded bootstrap content present + in sync with the shipped
  version, LM Studio reachable (if the split-and-label workflow is enabled).
- **G4. Auto-provisions plugins + scripts during onboarding.** First-run
  wizard downloads pinned versions of the Templater and Local REST API plugins
  from their GitHub releases, extracts them into `<vault>/.obsidian/plugins/`,
  patches `<vault>/.obsidian/community-plugins.json`, pre-seeds Templater
  settings (`data.json`), copies the embedded
  `obsidian-vault-bootstrap/_system/*` tree into the vault, and verifies the
  result with a `VaultDiagnosticsReport` pass.
- **G5. Replaces silent "0 exported" with empty-state guidance.** When
  the user clicks "Sync All" and there is nothing to export / no vault / no
  plugin, the UI surfaces a specific, actionable prompt — never a toast
  saying "Exported 0 notes" that hides the real cause.

## 2. NON-GOALS

- N1. **No change to the main processing pipeline.** `ProcessQueueWorker`,
  `IMarkdownExporter`, `ProcessedNote.ExportedToVault`, the job progress SSE
  stream, and the retry affordance at `POST /api/notes/{id}/export` stay
  as-is. The sidecar subscribes to already-published domain events; it does
  not get wired into the synchronous pipeline.
- N2. **No PARA move engine.** `ObsidianLayoutService.MovedNotes` stays 0.
  The rule engine (`FolderMapping` + `VaultExportRule`) is ADR-007 phase 2 and
  is out of scope here. This ADR only removes the `movedNotes: 0` footgun by
  renaming the endpoint response to explicitly state "rule-engine not
  implemented" when the layout is applied.
- N3. **No Syncthing work.** `SyncthingFolderInitializer` and the sync
  mobile setup are orthogonal. They consume the vault; they don't shape the
  sidecar contract.
- N4. **No Obsidian import (vault → mozgoslav).** One-way only: mozgoslav
  writes to the vault. Reading user-edited markdown back is a future ADR.
- N5. **No auto-start of Obsidian from mozgoslav.** We don't launch the
  Obsidian app. Onboarding tells the user to enable plugins after the FS
  patch; the optional deep-link `obsidian://show-plugin?id=…` is a best-effort
  nudge, not a hard requirement.
- N6. **No per-profile Templater templates.** One
  `_system/templates/split-and-label.md` + one `Templates/Mozgoslav
  Conversation.md`. Per-profile templates are a revisit item.
- N7. **No plugin-marketplace support.** We only auto-install Templater and
  Local REST API (both by pinned GitHub-release SHA). Everything else stays
  guided (deep-link + status chip).

## 3. OPEN QUESTIONS — DEFAULTS LOCKED

| ID | Question | Default | Rationale |
|----|----------|---------|-----------|
| OQ-1 | Does the wizard auto-toggle the plugin's `Enable` bit in `.obsidian/community-plugins.json` or stop at "copied, please enable"? | **Auto-toggle.** We write the plugin id into `community-plugins.json` during the wizard. | User answer Q2 = "full auto". Obsidian picks up the change on next app start or on the `Reload app without saving` command. |
| OQ-2 | Where does the Local REST API token come from? | **Read from `<vault>/.obsidian/plugins/obsidian-local-rest-api/data.json` after the user enables the plugin.** | The plugin generates the token on first enable; we cannot forge it. Wizard step 4 polls the data file up to 30 s, then saves the token into mozgoslav `AppSettings.ObsidianApiToken`. |
| OQ-3 | Embedded vs downloaded bootstrap content? | **Embedded.** `obsidian-vault-bootstrap/*` is copied into `backend/src/Mozgoslav.Infrastructure/Resources/ObsidianBootstrap/` as `EmbeddedResource` items. | User answer Q3 = "Embedded". Version-locks bootstrap to the app build; keeps first-run offline-capable. |
| OQ-4 | Drift detection between embedded bootstrap and vault content? | **Content-hash compare on every `diagnostics` call; surface `BootstrapDrift` with per-file status (missing / outdated / extra / ok); wizard offers `Reapply bootstrap` which overwrites outdated + missing, leaves `extra` untouched. | Users edit `corrections.md`; we MUST NOT clobber it on every app start. Only mutating files keep the shipped hash; user-maintained files live in a non-overwrite list. |
| OQ-5 | What counts as "Obsidian is connected" for the onboarding success gate? | **All five green in `VaultDiagnosticsReport`**: vault valid, plugins installed+enabled, Templater settings configured, bootstrap content in sync, (REST reachable — only if the user enabled the REST-API feature). LM Studio is probed but marked `advisory` — it can be red and the wizard still completes. | LM Studio reachability is a feature of split-and-label, not of the integration itself. |
| OQ-6 | Where does the UI entry point live? | **`Settings → Obsidian` tab** (already exists — `frontend/src/features/Obsidian/Obsidian.tsx`). First-run, when vault is not configured, the tab shows the wizard (modal stepper). Afterwards, it shows the ongoing diagnostics + "Reapply bootstrap" / "Reinstall plugins" buttons. | Reuses the existing tab; no new top-level route; consistent with ADR-018 tracker placement. |
| OQ-7 | `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` — resurrect red test, or extend green test? | **Extend green test.** VERIFIED at `origin/main 1032449` by the executor: all three tests in `ObsidianBulkExportTests` pass. Current body is `{ error: "Vault path is not configured" }`. ADR-019 changes the body to `{ error, hint, actions }`; the existing test assertion is replaced to match the new body. Prior wording (§4.3 D1, OBSIDIAN.md) was stale. | Contract parity; preserve the scenario coverage. |

## 4. CONTEXT (current state, verified THIS turn)

Verified by reading the repo at local HEAD `14f008b` (feature branch) against
`origin/main` = `1032449` on 2026-04-23.

### 4.1 Files that already exist and MUST be read before edits

| File | Role | Size |
|---|---|---|
| `backend/src/Mozgoslav.Infrastructure/Services/ObsidianSetupService.cs` | Creates `_inbox`, `People`, `Projects`, `Topics`, `Templates`; drops `Templates/Mozgoslav Conversation.md` (hardcoded template body in `TemplateBody`). Idempotent. | 108 lines |
| `backend/src/Mozgoslav.Infrastructure/Services/ObsidianBulkExportService.cs` | Implements `IObsidianExportService`. Throws `InvalidOperationException("Vault path is not configured")` when vault path missing. Returns `BulkExportResult(exported, skipped, failures)`. Failure-isolated loop. | 106 lines |
| `backend/src/Mozgoslav.Infrastructure/Services/ObsidianLayoutService.cs` | Implements `IObsidianLayoutService`. Creates PARA + `Inbox` + `Templates`. `MovedNotes` always 0. | 77 lines |
| `backend/src/Mozgoslav.Infrastructure/Services/ObsidianRestApiClient.cs` | `IObsidianRestClient`. `IsReachableAsync` (500 ms probe), `OpenNoteAsync`, `GetVaultInfoAsync`, `EnsureFolderAsync`. Uses named `HttpClient` `Mozgoslav.Obsidian` for self-signed cert handling. | 149 lines |
| `backend/src/Mozgoslav.Api/Endpoints/ObsidianEndpoints.cs` | `POST /api/obsidian/setup`, `POST /api/obsidian/export-all`, `POST /api/obsidian/apply-layout`, `GET /api/obsidian/rest-health`, `POST /api/obsidian/open`, `GET /api/obsidian/detect`. | 169 lines |
| `backend/src/Mozgoslav.Application/Interfaces/IObsidianExportService.cs` | Port. | 849 B |
| `backend/src/Mozgoslav.Application/Interfaces/IObsidianLayoutService.cs` | Port. | 667 B |
| `backend/src/Mozgoslav.Application/Interfaces/IObsidianRestClient.cs` | Port. | 1.4 KB |
| `backend/src/Mozgoslav.Application/Interfaces/IAppSettings.cs` | Holds `VaultPath`, `ObsidianApiHost`, `ObsidianApiToken`, `SyncthingObsidianVaultPath`. | 1.9 KB |
| `frontend/src/features/Obsidian/Obsidian.tsx` | UI tab with Setup + Bulk export + REST status. | 163 lines |
| `frontend/src/features/Obsidian/__tests__/Obsidian.test.tsx` | 4 passing tests. MUST stay green. | 2.6 KB |
| `frontend/src/store/slices/obsidian/saga/{bulkExportSaga,setupObsidianSaga,applyLayoutSaga}.ts` | Saga wiring. | — |

### 4.2 Bootstrap content available at `/home/coder/workspace/obsidian-vault-bootstrap/`

Verified inventory:

```
_inbox/                                 (empty dir, .gitkeep)
archive/                                (empty dir, .gitkeep)
ideas/                                  (empty dir, .gitkeep)
insights/                               (empty dir, .gitkeep)
people/                                 (empty dir, .gitkeep)
questions/                              (empty dir, .gitkeep)
tasks/                                  (empty dir, .gitkeep)
_system/
  corrections.md                        (1.2K — user-maintained, DO NOT clobber)
  flagged.md                            (0B    — appendable by scripts)
  prompts/split-and-label-prompt.md     (4.3K — shipped, overwrite on drift)
  scripts/split_and_label.js            (6.5K — shipped, overwrite on drift)
  templates/split-and-label.md          (375B — shipped, overwrite on drift)
README.md                               (3.7K — shipped, overwrite on drift)
```

### 4.3 Known defects to fix or explicitly not-fix here

1. **D1. `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` response body
   enrichment (NOT a red-test fix).** VERIFIED at `origin/main 1032449`: the
   test and its two siblings in `ObsidianBulkExportTests` pass. Guard at
   `ObsidianBulkExportService.cs:54-57` fires on empty `VaultPath`;
   `ObsidianEndpoints.cs:59-62` catches and returns BadRequest with body
   `{ error: "Vault path is not configured" }`. The prior claim in
   `docs/OBSIDIAN.md` ("падает тест на экспорт без vault") was stale on this
   commit. ADR-019 delta: the body becomes `{ error, hint, actions }` per
   §5.6; the existing assertion is rewritten to match the new body — no
   new test class, same `ObsidianBulkExportTests` file.
2. **D2. `movedNotes: 0` footgun.** Not moved into scope to "fix" PARA; only
   renamed in the response to `{ createdFolders, movedNotes: 0, reason:
   "rule-engine-not-implemented" }` so the UI can render a neutral state
   instead of a misleading 0.
3. **D3. `ObsidianApiToken` is required for `IsReachableAsync` to return
   true.** Wizard OQ-2 handles this.

### 4.4 Repo conventions that MUST hold (CLAUDE.md)

- `net10.0`, `LangVersion=14`, `Nullable=enable`, `TreatWarningsAsErrors=true`.
- One class per file. No `#region`. No primary constructors (traditional
  ctors with explicit `readonly` fields). `sealed` on leaf classes,
  `internal` where cross-project visibility is not needed.
- No comments in `.cs` files (team rule). XML `///` summaries only on public
  API surface.
- Central package management (`Directory.Packages.props`).
- Tests: MSTest + FluentAssertions + NSubstitute. Integration tests use real
  SQLite temp files via `TestDatabase`.
- Frontend: Container + Presentational split; styled-components only; i18n
  via `useTranslation` with keys in both `ru.json` and `en.json`; default
  export for components, named for utilities.
- Electron bridge edits: both `preload.ts` (contextBridge) and `main.ts`
  (ipcMain.handle) must change together.
- `dotnet` commands pass `-maxcpucount:1`. Frontend dev requires
  `WATCHPACK_POLLING=true`.

## 5. DECISION

### 5.1 Layered shape

```
 ┌─────────────────────── main ingest pipeline (UNCHANGED) ───────────────────────┐
 │ ProcessQueueWorker → Whisper → LLM polish → Note save → export flag flips      │
 └────────────────────────────────────────────────────────────────────────────────┘
          │
          │ domain event: ProcessedNoteSaved / ProcessedNoteRetained
          ▼
 ┌─────────────────────── Obsidian sidecar (new) ─────────────────────────────────┐
 │                                                                                │
 │   Application/Obsidian/                                                        │
 │     IVaultDriver                  ← single write port                          │
 │     IVaultDiagnostics             ← single connection-check port               │
 │     IVaultBootstrapProvider       ← embedded-resource reader                   │
 │     IPluginInstaller              ← GitHub-release download + FS patch         │
 │     VaultSidecarOrchestrator      ← idempotent apply(state) reconciler         │
 │     ObsidianDomainEventHandler    ← subscribes to ProcessedNoteSaved,          │
 │                                     enqueues a non-blocking export job         │
 │                                                                                │
 │   Infrastructure/Obsidian/                                                     │
 │     FileSystemVaultDriver         ← the ONLY write driver                      │
 │     VaultDiagnosticsService       ← checks everything in one pass              │
 │     EmbeddedVaultBootstrap        ← reads Resources/ObsidianBootstrap/*        │
 │     GitHubPluginInstaller         ← pinned releases (Templater,                │
 │                                     Local REST API)                            │
 │     ObsidianRestApiClient         ← (kept, read-only: Ping + OpenNote)        │
 │                                                                                │
 │   Api/Endpoints/ObsidianEndpoints.cs                                           │
 │     POST   /api/obsidian/wizard/start            — returns wizard state        │
 │     POST   /api/obsidian/wizard/step/{n}         — executes one idempotent step │
 │     GET    /api/obsidian/diagnostics             — full VaultDiagnosticsReport │
 │     POST   /api/obsidian/reapply-bootstrap       — overwrites shipped files    │
 │     POST   /api/obsidian/reinstall-plugins       — re-fetches pinned versions  │
 │     POST   /api/obsidian/export-all              — unchanged contract,         │
 │                                                    BadRequest body is enriched │
 │     POST   /api/obsidian/open                    — unchanged                   │
 │     GET    /api/obsidian/detect                  — unchanged                   │
 │     POST   /api/obsidian/setup                   — DEPRECATED alias of wizard  │
 │     POST   /api/obsidian/apply-layout            — unchanged contract,         │
 │                                                    response renamed            │
 └────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 `IVaultDriver` (Application port)

```csharp
public interface IVaultDriver
{
    Task EnsureVaultPreparedAsync(VaultProvisioningSpec spec, CancellationToken ct);
    Task<VaultWriteReceipt> WriteNoteAsync(VaultNoteWrite write, CancellationToken ct);
    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
    Task<VaultDiagnosticsReport> DiagnoseAsync(CancellationToken ct);
}
```

- `VaultProvisioningSpec` enumerates every file the driver is allowed to
  write (`BootstrapFileSpec[]` with `{ VaultRelativePath, EmbeddedResourceKey,
  WritePolicy }` where `WritePolicy ∈ { Overwrite, CreateIfMissing,
  UserOwned }`. `UserOwned` = never touch after first creation — e.g.,
  `_system/corrections.md`).
- `WriteNoteAsync` replaces the current `IMarkdownExporter` + direct
  `File.WriteAllTextAsync` split: one place, one error surface, one
  receipt.
- `DiagnoseAsync` is the only source of truth for "is Obsidian connected".

### 5.3 `VaultDiagnosticsReport`

```csharp
public sealed record VaultDiagnosticsReport(
    VaultPathCheck Vault,
    IReadOnlyList<PluginCheck> Plugins,
    TemplaterSettingsCheck Templater,
    BootstrapDriftCheck Bootstrap,
    RestApiCheck RestApi,
    LmStudioCheck LmStudio,
    DateTimeOffset GeneratedAt)
{
    public bool IsHealthy => Vault.Ok && Plugins.All(p => p.Ok || p.Optional)
        && Templater.Ok && Bootstrap.Ok
        && (!RestApi.Required || RestApi.Ok);
}
```

Each `*Check` carries `{ Ok, Severity, Code, Message, Actions }` where
`Actions` is a whitelisted enum (`OpenOnboarding`, `ReinstallPlugins`,
`ReapplyBootstrap`, `RefreshRestToken`, `OpenLmStudioHelp`, `OpenSettings`).
The frontend renders per-check chips + an action button per non-green chip.

### 5.4 Unified write pipeline

There is exactly ONE class that writes to the vault:
`FileSystemVaultDriver`. `ObsidianSetupService`,
`ObsidianBulkExportService`, `ObsidianLayoutService`, and the hardcoded
`TemplateBody` constant are rewritten or retired:

- `ObsidianSetupService` → becomes the bootstrap-installer step inside
  `VaultSidecarOrchestrator`, delegating to `IVaultDriver.EnsureVaultPrepared`.
- `ObsidianBulkExportService` → keeps its `IObsidianExportService` port but
  its implementation calls `IVaultDriver.WriteNoteAsync` and `WriteNoteAsync`
  alone. No direct `File.WriteAllTextAsync`.
- `ObsidianLayoutService` → keeps the port, delegates to
  `IVaultDriver.EnsureFolderAsync`. Response is renamed to
  `ApplyLayoutResult { CreatedFolders, MovedNotes = 0, Reason =
  "rule-engine-not-implemented" }` so UI can communicate clearly.
- `ObsidianRestApiClient` → kept, but **downscoped to read-only** (Ping +
  OpenNote + GetVaultInfo). `EnsureFolderAsync` is removed from the REST
  client because the FileSystem driver is now the sole writer. Existing DI
  registrations for REST-write paths are deleted.
- Template bodies and bootstrap content move from hardcoded C# strings to
  `EmbeddedVaultBootstrap.ReadAsync(key, ct)` over
  `Mozgoslav.Infrastructure.Resources.ObsidianBootstrap.*` resources.

### 5.5 Decoupling guarantee (G1)

- `ProcessQueueWorker` publishes a domain event on successful note save:
  `ProcessedNoteSaved(noteId, profileId, savedAt)`. This event is new but
  cheap: single line in the worker + single interface `IDomainEventBus` (or
  reuse `Channel<T>` pattern from `IJobProgressNotifier`).
- `ObsidianDomainEventHandler` subscribes. On event it enqueues a
  non-blocking call to `IVaultDriver.WriteNoteAsync`. Enqueue happens on a
  bounded `Channel<VaultNoteWrite>` with `BoundedChannelFullMode.DropOldest`
  after capacity N (default: 128). Failures are logged to Serilog +
  `MozgoslavMetrics.ObsidianExportFailure.Inc()`, but do NOT propagate.
- The `POST /api/obsidian/export-all` endpoint stays the "manual backfill"
  path: it iterates notes with `ExportedToVault=false` and pushes them
  through the SAME `IVaultDriver`.

### 5.6 Empty-state guidance (G5)

`POST /api/obsidian/export-all` never returns `{ exported: 0, skipped: *,
failures: [] }` as a success payload. The server inspects diagnostics:

```jsonc
// no vault configured
{ "error": "vault-not-configured",
  "hint": "Open Settings → Obsidian and run the first-run wizard.",
  "actions": ["OpenOnboarding"] }

// vault configured but plugins missing
{ "error": "plugins-missing",
  "hint": "Templater is required for the split-and-label workflow.",
  "actions": ["ReinstallPlugins"] }

// vault + plugins ok, nothing new to export
{ "exported": 0,
  "skipped": 42,
  "failures": [],
  "hint": "All notes are already in the vault." }          // 200 OK
```

The UI contract: 4xx payloads show a full-width banner with a single action
button; 200 with `exported=0 && skipped>0` shows a muted "up to date" chip.

### 5.7 Wizard (G4)

Wizard is a state machine in the backend with 5 idempotent steps. Each step
is driven by `POST /api/obsidian/wizard/step/{n}` and returns the next step
+ a per-step diagnostics delta. Re-running a completed step is a no-op.

| # | Step | Owner | Writes where | Failure UX |
|---|------|-------|--------------|------------|
| 1 | Choose/confirm vault path | user | `IAppSettings.VaultPath` (via `SaveAsync`) | Inline validation: path exists, is writable, either has `.obsidian/` or user ticks "make this an Obsidian vault" → Obsidian deep-link to open-as-vault. |
| 2 | Install plugins | backend | `<vault>/.obsidian/plugins/{templater-obsidian,obsidian-local-rest-api}/{main.js,manifest.json,styles.css?}` + patch `community-plugins.json` with both ids | On HTTP failure: retry button; on write failure: show FS error + path. |
| 3 | User enables plugins in Obsidian | user | — (user action, we only poll) | Step is gated on the plugin ids appearing in `community-plugins.json` (user toggle) AND Templater `data.json` being non-default; we poll up to 90 s. Skip button allows "I'll do it later". |
| 4 | Capture REST token | backend | reads `<vault>/.obsidian/plugins/obsidian-local-rest-api/data.json`, writes token into `IAppSettings.ObsidianApiToken`. | If not found in 30 s, step completes with `RestApi.Ok=false` and is revisitable via `Reinstall plugins`. |
| 5 | Install bootstrap + Templater preset | backend | `<vault>/_system/**`, `<vault>/_inbox/**`, `<vault>/Templates/Mozgoslav Conversation.md`, and `<vault>/.obsidian/plugins/templater-obsidian/data.json` pre-seeded with `{ templates_folder: "_system/templates", user_scripts_folder: "_system/scripts", trigger_on_file_creation: false, enable_system_command: true, user_functions_enabled: true }`. | Per-file failures aggregated into a list with retry per file. |

The wizard MUST be resumable: interrupting the app between steps and
re-opening it resumes on the first step whose diagnostics sub-report is not
green. State lives in diagnostics, not in a wizard-specific table.

### 5.8 Plugin installer (pinned, offline-tolerant)

- `GitHubPluginInstaller` fetches `https://github.com/<owner>/<repo>/releases/download/<tag>/<asset>` over the system `HttpClient`. No redirect chasing beyond two hops. SHA-256 of each downloaded asset is compared against a table shipped in
  `Mozgoslav.Infrastructure/Resources/ObsidianBootstrap/pinned-plugins.json`.
  Mismatch → abort, surface `PluginHashMismatch` diagnostic, never write to
  the FS.
- Two pins at ship time:
  - `templater-obsidian` → exact release TBD by the executor agent (pick the latest stable release as of the commit date, record SHA-256 of `main.js` + `manifest.json` + `styles.css`).
  - `obsidian-local-rest-api` → same.
- Offline fallback: if GitHub is unreachable, the wizard step 2 fails with a
  `PluginDownloadUnavailable` diagnostic + a "Try again later" action. We do
  NOT bundle the plugin binaries inside the app (licensing + update story).

### 5.9 Bootstrap drift (OQ-4)

- Every shipped file has an SHA-256 computed at build time via an MSBuild
  target and emitted into
  `Mozgoslav.Infrastructure.Resources.ObsidianBootstrap.manifest.json`.
- `BootstrapDriftCheck` walks the manifest, computes the vault-side SHA, and
  classifies each entry as `Ok | Missing | Outdated | UserModified | Extra`.
- `UserOwned` files (`_system/corrections.md`) are classified against an
  empty-file baseline: if absent, `Missing`; if present, `Ok` regardless of
  content (we respect user edits).
- `Reapply bootstrap` overwrites `Missing` + `Outdated`, leaves
  `UserModified` and `Extra` untouched, and in all cases backs up overwritten
  files to `<vault>/.mozgoslav/bootstrap-backups/<iso-date>/<relpath>` before
  write.

### 5.10 Frontend changes

- `features/Obsidian/Obsidian.tsx` renders two views:
  - **Wizard view** (shown if `diagnostics.Vault.Ok === false` or no vault
    configured): 5-step stepper wired to `wizard/step/{n}`.
  - **Diagnostics view** (shown afterwards): per-check chip grid + action
    buttons (`Reapply bootstrap`, `Reinstall plugins`, `Refresh REST token`,
    `Run Sync All`).
- `slices/obsidian/` gains:
  - `wizardSaga.ts` — drives the stepper.
  - `diagnosticsSaga.ts` — fetches `/api/obsidian/diagnostics` on tab open
    and on every push (SSE via the existing `/api/jobs/stream` reused —
    `eventType: "obsidian-diagnostics"` — OR a simple manual poll every 5 s
    while the tab is focused; defer to executor agent's judgement).
  - Empty-state component consumed by `bulkExportSaga.ts` to render 4xx
    banners.
- i18n keys added to both `ru.json` and `en.json`. Wizard copy is
  locale-aware; plugin ids are not translated.
- All previous tests in `Obsidian.test.tsx` MUST stay green. New tests cover
  the empty-state banner + the wizard happy-path (mock `wizard/step` server).

### 5.11 Settings shape

No breaking schema change. We add to `IAppSettings`:

- `bool ObsidianFeatureEnabled` (default: `false`). Gates the entire sidecar;
  when `false`, `ObsidianDomainEventHandler` is a no-op and
  `ObsidianEndpoints` return `503 ServiceUnavailable {reason:
  "obsidian-feature-disabled"}` except `GET /api/obsidian/diagnostics` which
  always responds.
- `string ObsidianBootstrapPins` (embedded-resource path; read-only).

Existing `VaultPath`, `ObsidianApiHost`, `ObsidianApiToken`,
`SyncthingObsidianVaultPath` stay untouched.

## 6. CONSEQUENCES

### 6.1 Positive

- One write path → one place to debug, instrument, test.
- The main pipeline never blocks on an external editor.
- Users see *why* an export did nothing, not a silent "0".
- The wizard is the single funnel for onboarding; diagnostics is the
  single surface for ongoing health.
- Embedded bootstrap keeps releases reproducible and offline-viable.
- `obsidian-vault-bootstrap` repo becomes the authoring surface; mozgoslav
  release pulls it in via a pre-build script (`scripts/sync-obsidian-bootstrap.sh`)
  that copies `_system/*` + `README.md` into `Resources/ObsidianBootstrap/`
  with generated hash manifest. Repo stays separate; release is monolithic.

### 6.2 Negative / mitigations

- **Mitigation for silent plugin misconfig**: Templater will not run if the
  user renames the templates folder. Diagnostic `TemplaterSettingsCheck`
  reads `plugins/templater-obsidian/data.json` and compares to our
  pre-seed; drift is surfaced with a one-click "Restore Templater settings".
- **Mitigation for REST-API token rotation**: if the user regenerates the
  token inside Obsidian, `IsReachableAsync` fails; diagnostics surfaces
  `RestApi.Ok=false, Code=TokenMismatch`, action = `RefreshRestToken` which
  re-reads `data.json`.
- **Mitigation for bootstrap drift in production**: manifest hash compare is
  cheap (<50 ms for the shipped set); runs on every diagnostics call.
- **Mitigation for plugin-repo outage**: pinned SHA + "try again later"
  action; we never fall back to an unpinned / unchecked asset.
- **Risk: user has Obsidian open during plugin copy.** We write atomically
  (write to `*.tmp`, `File.Move` overwrite). Obsidian picks up changes on
  next `Reload app without saving`; diagnostics tells the user so.

## 7. ALTERNATIVES CONSIDERED (and rejected)

- **A1. REST-first write path.** Rejected: REST API plugin is third-party,
  self-signed, optional, and adds latency. File I/O is the direct model.
- **A2. BRAT-style installer.** Rejected: extra dependency, UX overhead
  ("install BRAT first"), still requires the toggle flow.
- **A3. Submodule `obsidian-vault-bootstrap` inside mozgoslav.** Rejected:
  users don't have git on the vault machine; pulling a submodule from
  Electron is fragile.
- **A4. Server-side git clone of the bootstrap repo into the vault.**
  Rejected: touching the vault root with a `.git/` surprises users and
  fights Syncthing.
- **A5. Keep two write paths (REST + FS) behind a strategy.** Rejected: user
  answer Q1 — Obsidian is a sidecar, not a driver choice. We collapse to one.

## 8. ROLLBACK

- Single feature flag `ObsidianFeatureEnabled = false` (OQ default) disables
  every sidecar code path and reverts endpoints to `503
  obsidian-feature-disabled` — the main pipeline is untouched by design, so
  there is nothing to roll back there.
- `Reapply bootstrap` restores the last-known-good shipped files from the
  embedded resources at any time.
- All overwritten files are backed up to
  `<vault>/.mozgoslav/bootstrap-backups/<iso-date>/<relpath>` before write;
  rollback is a manual copy-back.

## 9. DONE DEFINITION

- **D1.** `backend && dotnet test -maxcpucount:1` green on a clean branch
  off `origin/main 1032449`, including
  `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` and new tests for
  `FileSystemVaultDriver`, `VaultDiagnosticsService`,
  `GitHubPluginInstaller` (HTTP-mocked), `EmbeddedVaultBootstrap`,
  `VaultSidecarOrchestrator` (state-machine happy-path + each failure
  branch).
- **D2.** `frontend && npm run typecheck && npm test` green, including
  preserved `Obsidian.test.tsx` and new tests for wizard saga + empty-state
  banner.
- **D3.** `frontend && npm run build` passes with no new TS/TSC warnings.
- **D4.** Manual smoke on macOS dev box:
  1. Fresh empty folder → wizard step 1 picks it → step 2 downloads both
     plugins (hashes match) → step 3 polls until user enables plugins in
     Obsidian → step 4 captures REST token → step 5 installs bootstrap →
     diagnostics all green → "Sync All" exports a test note → note opens
     from the UI via REST.
  2. Disable `ObsidianFeatureEnabled` → Obsidian tab shows "Feature
     disabled, enable in Settings"; main pipeline processes a recording
     with zero Obsidian calls (Serilog-verified).
  3. Delete `_system/scripts/split_and_label.js` from the vault →
     diagnostics flags `Bootstrap.Outdated|Missing` → `Reapply bootstrap`
     restores the file; user edits in `_system/corrections.md` are
     preserved.
  4. Rotate REST token inside Obsidian → diagnostics flags
     `RestApi.TokenMismatch` → `Refresh REST token` restores green.
- **D5.** ADR-019 committed to `mozgoslav/docs/adr/ADR-019-obsidian-optional-sidecar.md`
  on branch `shuka/obsidian-optional-sidecar` (from `origin/main`). No
  change to `origin/main`; no force-push.
- **D6.** `CLAUDE.md` updated with the new ports + resource folder.
- **D7.** Telemetry: `MozgoslavMetrics.ObsidianExportAttempted`,
  `ObsidianExportFailure`, `ObsidianDiagnosticsCheck{check=…,ok=…}`,
  `ObsidianWizardStep{step=…,result=…}` counters registered and emitted.

## 10. OPEN / DEFERRED (not in this ADR)

- Auto-import of vault edits back into mozgoslav (N4).
- Per-profile Templater templates (N6).
- PARA move engine (N2 → ADR-007 phase 2).
- Per-plugin marketplace support beyond Templater + Local REST API (N7).
- First-run bundling of Obsidian itself (N5).

## 11. DEVIATIONS OR UNVERIFIED

- The exact pinned releases for Templater and Local REST API (version + asset
  SHA-256) are **UNVERIFIED at draft time**. The executor agent MUST pick a
  stable release as of the implementation commit and record the SHAs in
  `Resources/ObsidianBootstrap/pinned-plugins.json`. Any change after that
  goes through an ADR addendum.
- **Correction 2026-04-23 (post-draft).** The original §4.3 D1 and §3 OQ-7
  claimed that `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` was red
  at `origin/main 1032449`. The executor agent reproduced the baseline on a
  clean checkout and confirmed: **the test is GREEN** (3/3 in
  `ObsidianBulkExportTests` pass). The stale claim came from
  `docs/OBSIDIAN.md` at an earlier commit. ADR-019 no longer "resurrects a
  red test"; it enriches the response body on the endpoint that already
  returns BadRequest, and rewrites the existing assertion to match the new
  body shape. §4.3 D1 and §3 OQ-7 have been updated in place to reflect
  the verified state.
- The decision to poll `community-plugins.json` for user-toggle in wizard
  step 3 (vs. relying on an Obsidian deep-link) is a UX trade-off the
  executor agent may revisit with a first-hand test; if deep-link is
  reliable, the poll can become a progress indicator only.
- **D4 smoke tests are macOS-only.** They cannot be executed from the Linux
  sandbox the implementation agent runs in. They are deferred to the user's
  macOS dev box. Reproduction steps are documented in each MR body; the MRs
  may be opened green on unit + integration tests without D4 completion and
  land after the user confirms D4 on macOS.
