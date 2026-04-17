# Agent B — ADR-006 UX + LM Studio V2 report

**Branch:** `shuka/adr-006-ux-lm-studio-v2`
**PR:** #4 (draft)
**Mandate:** B1–B15 from the orchestrator brief + ADR-006 D-1…D-15, obeying PDD's 9 commandments.

## Environment notes

- `dotnet` not available in this sandbox — every backend change was authored against read code + tests, but **not compiled locally**. Reviewer must run `dotnet build -c Release -maxcpucount:1` and `dotnet test -maxcpucount:1` before merging.
- `node` is available; `npm run i18n:audit` is green after every iteration (final: ru=202, en=202).
- Frontend `typecheck` / `build` was not invoked — Reviewer runs `npm run typecheck && npm run build`.

## ADR-006 — status per D-point (second pass, post-fixes)

| ID    | Decision                                                             | Status  |
|-------|----------------------------------------------------------------------|---------|
| D-1   | Button ramp 28/34/42 + focus + disabled                              | ✅ |
| D-2   | Modular 1.25 body (12/13/15/19/24/30) + hero 39px                    | ✅ |
| D-3   | Motion preset table (`src/styles/motion.ts`)                         | ✅ |
| D-4   | Liquid Glass chrome — `liquidGlass` + `liquidGlassBackdrop` mixins applied to sidebar / modal / command palette, `@supports not` fallback | ✅ — hero CTA uses hand-rolled gradients; `liquid-glass-react` dep **intentionally not pulled** until we have a refraction-shaded surface that actually needs it |
| D-5   | `framer-motion` → `motion` package rename + `LazyMotion+strict`      | ✅ |
| D-6   | macOS palette tokens                                                 | ✅ |
| D-7   | `BrainLauncher` component                                            | ✅ |
| D-8   | Dashboard record button + 4-state dictation machine                  | ✅ |
| D-9   | Queue cancel — `DELETE /api/queue/{id}`; queued→204, in-flight→marks `Failed` with `Cancelled by user`, terminal→409, unknown→404 | ✅ |
| D-10  | i18n audit + ru/en parity (202/202)                                  | ✅ |
| D-11  | LM Studio — `{ installed, reachable, suggested }` endpoint + Suggested curated deep-links + Models page **read-only** (Download buttons removed) | ✅ |
| D-12  | `npm run dev` spawns backend+frontend+sidecar; `npm run build` runs `dotnet publish` → pip vendor → vite build → `electron-builder --mac` (macOS-only gated) | ✅ |
| D-13  | Focus ring + disabled + reduced-motion mixins                        | ✅ |
| D-14  | `ILlmProvider` + `OpenAiCompatibleLlmProvider` / `AnthropicLlmProvider` / `OllamaLlmProvider` + `LlmProviderFactory` + `LlmChunker` + nested `AppSettings.llmProvider` + UI picker | ✅ |
| D-15.a | macOS mic capture — `FfmpegAudioRecorder` (interim per ADR permission to ship ffmpeg until Swift helper lands) | ⚠️ interim; Swift `AVCaptureSession` deferred (requires macOS toolchain) |
| D-15.b | Profile CRUD + duplicate + per-app assignment table (bundleId → profileId) + `transcriptionPromptOverride` round-trip | ✅ |
| D-15.c | kbar command palette                                                 | ✅ |
| D-15.d | Welcome+privacy → Models → Obsidian → LLM → Syncthing → Mic → AX → Input-Monitoring → Ready; backend `settings.onboardingComplete` flag; re-entry via Settings "Run onboarding again"; reduced-motion + Back button | ✅ |

Only D-15.a remains "interim" and is explicitly DEFERRED in the ADR itself — ffmpeg AVFoundation is the documented stopgap until a Swift `AVAudioEngine` helper ships.

## Discovery — `.gitignore` `models/` collision

Root `.gitignore` has a broad `models/` rule (meant for ML binaries under `AppPaths.Models`) that silently swallowed `frontend/src/models/`. Every `../models/*` import in the frontend was dead — `npm run typecheck` would have failed repo-wide. Resolution: migrated the entire DTO layer to `frontend/src/types/` (Profile, Recording, ProcessingJob, ProcessedNote, Model, Settings), retargeted 11 imports. Gitignore rule left intact.

## Tests I wrote (pending `dotnet test` run)

- `ApiEndpointsTests.cs`:
  - `Profiles_Delete_UserCreated_ReturnsNoContentAndRemoves`
  - `Profiles_Delete_BuiltIn_ReturnsConflict`
  - `Profiles_Delete_UnknownId_ReturnsNotFound`
  - `Queue_Delete_QueuedJob_ReturnsNoContentAndRemoves`
  - `Queue_Delete_InFlightJob_ReturnsOkAndMarksFailed`
  - `Queue_Delete_TerminalJob_ReturnsConflict`
  - `Queue_Delete_UnknownId_ReturnsNotFound`
- `SqliteProcessingJobRepositoryTests.cs`:
  - `CancelAsync_QueuedJob_RemovesAndReturnsRemovedFromQueue`
  - `CancelAsync_InFlightJob_MarksFailedWithCancelledMessage`
  - `CancelAsync_UnknownId_ReturnsNotFound`

## Cleanup pass

- `ModelDownloadService` + `POST /api/models/download` + `ModelCatalog.TryGet` — deleted after D-11 pivot.
- `IProcessingJobRepository.CancelQueuedAsync` — removed; `CancelAsync` covers every branch.
- `SettingsApi.ts` — deleted, unused per-entity class that `MozgoslavApi` superseded.
- `styles/useMotionPreset.ts` + `resolveMotionPreset` + `listStaggerMs` — never consumed.
- `frontend/src/features/Queue` `style={{ ... }}` inline block replaced with `JobStatusGroup` styled-component per the CLAUDE.md "styled-components only" rule.
- `ONBOARDING_COMPLETED_STORAGE_KEY` localStorage path removed after switching to the backend `settings.onboardingComplete` flag.

## How to verify locally

```bash
# Backend
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln -maxcpucount:1

# Frontend
cd frontend && npm install && npm run typecheck && npm run test && npm run build

# Integrated dev loop (backend + frontend + python sidecar)
npm run dev

# Full production build (adds dotnet publish + pip vendor + electron-builder on macOS)
npm run build
```
