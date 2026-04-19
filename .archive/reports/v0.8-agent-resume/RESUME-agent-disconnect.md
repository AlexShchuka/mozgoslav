# v0.8 RESUME — pick up where disconnect stopped the agent

**Branch:** `shuka/v0.8-production-ready` (HEAD `3956524`)
**Last status:** Previous agent was about to append checkpoint summaries to plan files when Coder disconnected. All
implementation code and tests for Blocks 2-6 are committed. Block 7 partial. Block 8 not started.

---

## What is DONE (verified via git log + file inspection)

- **Block 1** — CI green fix (`57ed203`): `ModelDownloadService` progress + `DictationPushWebmOpus` routing.
- **Block 2** — Python ML sidecar (committed in `61d1124`+`3956524`): `diarize_service.py` (silero-vad + Resemblyzer +
  agglomerative clustering), `ner_service.py` (Natasha pipeline), `gender_service.py` + `emotion_service.py` (audeering
  with `ModelNotAvailableError` + 503 envelope), `ml/loader.py`, `ml/model_paths.py`, schemas, C# `PythonSidecarClient`,
  `ModelCatalog` Tier 1/2 entries.
- **Block 3** — Mac native recorder (`3956524`): `AVFoundationAudioRecorder`, `PlatformUnsupportedAudioRecorder`,
  `NoopAudioRecorder` deleted, conditional DI in `Program.cs`, `/api/audio/capabilities`,
  `/api/recordings/{start,stop}`, Electron `RecordingBridge`, `PermissionProbe.swift`, `AudioCaptureService.swift`
  extended, Dashboard wiring.
- **Block 4** — Onboarding slim (`3956524`): `OnboardingPlatform.ts`, `hooks.ts`, `Onboarding.tsx` refactor, ru/en i18n,
  `__tests__/Onboarding.test.tsx`.
- **Block 5** — Glossary + LLM correction (`3956524`): `GlossaryApplicator`, `LlmCorrectionService`, migration `0013`,
  `Profile.LlmCorrectionEnabled`, `ProcessQueueWorker` pipeline stage.
- **Block 6** — Obsidian REST (`3956524`): `IObsidianRestClient`, `ObsidianRestApiClient`, `ObsidianEndpoints` with
  `/open` + `/rest-health`, WireMock tests.
- **Block 7 partial** (`3956524`): `.github/workflows/release.yml`, `backend/.../MetaEndpoints.cs` (`/api/meta`),
  `scripts/fetch-bundle-models.sh`, `scripts/build-icon.sh`, `electron-builder.yml` updated, `package.json` duplicated
  `build` section removed.

---

## What is LEFT — your scope

### A. Verify Block 7 completeness

- `frontend/build/icon-source.png` — should exist, OR `frontend/build/icon-source.TODO` documenting what shuka needs to
  provide on Mac. Create if missing.
- `frontend/build/bundle-models.manifest.json` — should exist with filenames + placeholder sha256. Create if missing.
- `README.md` — footnote about unsigned DMG right-click-Open. Add if missing.
- Append §Checkpoint summary to `plan/v0.8/07-dmg-and-release.md`.

### B. Block 8 — Cleanup + archive (per `plan/v0.8/08-cleanup-and-archive.md`)

- `mkdir -p .archive/reports` and `git mv` these 14+ files from repo root: `agent-a-report.md`, `developer-*.md` (4),
  `DICTATION-REPORT.md`, `FEATURE-DEV-REPORT.md`, `POLISH-REPORT.md`, `phase1-agent-a-report.md`, `phase2-*-report.md` (
  5), `todo-*-report.md` (2).
- `mkdir -p docs/adr/.archive-v2` and `git mv` `docs/adr/ADR-007*.md` (all 7 files in that family).
- Rewrite `docs/adr/README.md` — active ADRs: 008, 009, 010. Archive references.
- Rewrite `TODO.md` — shipped in v0.8 section, Phase 2 deferred section. **Do NOT bump version** (user directive).
- Rewrite `SELF-REVIEW.md` against ADR-009/010 compliance.
- Create `CONTRIBUTING.md` — move developer setup from README here.
- Refresh `README.md` — simple install / Onboarding / bundled models / link to CONTRIBUTING for devs.
- Refresh root `CLAUDE.md` — reference ADR-009/010, remove out-of-scope items now shipped.
- Grep `TODO\|FIXME\|HACK` in `backend/src frontend/src frontend/electron python-sidecar/app helpers` →
  resolve/delete/convert each. Do NOT keep stale markers.
- Append §Checkpoint summary to `plan/v0.8/08-cleanup-and-archive.md`.

### C. Append checkpoint summaries to Blocks 2-6 plan files

Short `§Checkpoint summary (2026-04-YY)` each: files changed, any deviation from plan, test status.

### D. One test pass + fixes

Run ONCE:

- `cd backend && dotnet test Mozgoslav.sln -maxcpucount:1 --filter "FullyQualifiedName!~Sidecar.SidecarContainer"` (
  exclude Docker tests)
-
`cd python-sidecar && source .venv/bin/activate 2>/dev/null || python -m venv .venv && source .venv/bin/activate && pip install -q -r requirements.txt -r requirements-dev.txt && pytest`
- `cd frontend && npm test -- --watchAll=false`

Fix failures with cap **3 iterations per test**. If can't go green — document in report and move on.

### E. Commit + push

- `git add -A && git commit -m "feat(release): block 7 finalize + block 8 cleanup + archive"` (or split into two
  commits).
- If test fixes needed: separate commit `fix(v0.8): test fixes after blocks 3-7 integration`.
- `git push -u origin shuka/v0.8-production-ready`.

---

## Hard rules (same as before)

- NO Docker/Testcontainers locally. Trust CI.
- NO full test suite inside iteration. One pass in step D.
- NO swift build, NO dist:mac, NO electron-builder run.
- `-maxcpucount:1` on dotnet always.
- Max 3 retries per failing test, then document and move on.
- One commit per logical unit, push at end.
- **Do NOT bump version** anywhere.

---

## Output

- Report to `/home/coder/workspace/agent-resume-<shortid>.md` outside repo.
- Chat: `Resume agent done. Pushed <hash> to shuka/v0.8-production-ready. <summary>.`
