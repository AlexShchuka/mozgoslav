# Block 1 — Fix CI failures (4 jobs green)

- **Block owner:** developer agent.
- **Mac validation required:** no.
- **Depends on:** nothing.
- **Unblocks:** all other blocks (block 2-8 run with green CI as a baseline).

---

## 1. Context

`.github/workflows/ci.yml` defines four jobs, each matrixed over `ubuntu-latest` and `macos-latest` (helper is macOS-only):

1. `backend` — `dotnet restore / build / test` of `backend/Mozgoslav.sln`.
2. `frontend` — `npm ci / typecheck / lint / test / build` in `frontend/`.
3. `python` — `pip install / ruff check / pytest` in `python-sidecar/`.
4. `dictation-helper` — `swift build / test` in `helpers/MozgoslavDictationHelper/`.

Per shuka's latest pasted log, `backend / macos-latest` is red with two specific test failures. The other three jobs' status has not been pulled in this session; agent confirms by running locally (where possible) or by pushing a scratch commit and reading the workflow run.

## 2. Known failures (from shuka's log, 2026-04-17)

### 2.1 Unit: `ModelDownloadServiceTests.DownloadAsync_HappyPath_WritesFileAndReportsProgress`

- **File:** `backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs:70`.
- **Assertion:** `reports.Should().NotBeEmpty()` — fails; `reports` is empty.
- **Meaning:** the test attaches an `IProgress<T>` to `ModelDownloadService.DownloadAsync`, simulates a download, and expects at least one progress report. The service completed without invoking the callback.

Hypotheses to check, in order:
1. The test payload is smaller than the service's internal progress-reporting threshold (e.g. the service only reports every 256 KB).
2. `IProgress<T>` is passed but never captured — check `DownloadAsync` signature vs. test invocation; possibly the overload resolution lands on a no-progress variant.
3. The service reports synchronously but the test asserts before the callback runs (unlikely for `await` paths, worth verifying).

Fix path:
- Read `DownloadAsync` implementation at `backend/src/Mozgoslav.Infrastructure/Services/ModelDownloadService.cs`. Confirm that progress is reported at least once for any non-empty payload (e.g. report `0` at start and `total` at end).
- Adjust either the service (emit progress for small payloads) or the test (use a payload size above the reporting threshold) — preference is to fix the service: a real user caring about progress wants to see it regardless of file size.

### 2.2 Integration: `DictationPushWebmOpusTests.Push_WebmOpusPayload_DecodesAndAccumulates`

- **File:** `backend/tests/Mozgoslav.Tests.Integration/DictationPushWebmOpusTests.cs:61`, same line mentioned at `:81`.
- **Endpoint under test:** one of `POST /api/dictation/push/{id}` or `POST /api/dictation/{id}/push` (log shows both shapes in adjacent tests — route ambiguity suspected).
- **Assertion:** `response.StatusCode.Should().Be(HttpStatusCode.OK)` — actual `BadRequest`.

Hypotheses to check, in order:
1. **Route mismatch.** Inspect `backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs` for the push route shape. Align test with canonical route; if both shapes exist, drop the duplicate.
2. **Content-Type / body shape.** The test likely uses `multipart/form-data` with a webm/opus blob; the endpoint may expect `application/octet-stream` or JSON-wrapped base64. Check binding attributes.
3. **Missing decoder.** The endpoint may call into an opus/webm decoder (likely `OpusFileDecoder` or similar in `Infrastructure.Services`) that requires `libopus` / `libogg` at runtime. On macos-latest runner, `brew install opus` may be needed, OR the decoder should be pure managed (preferred — no native dep).
4. **Sample payload rejected by validation.** The endpoint may require `Content-Type: audio/webm` exactly; the test may send `audio/webm;codecs=opus`.

Fix path:
- Read `DictationPushWebmOpusTests.cs` lines 55-85 to understand the exact request shape.
- Read the push endpoint handler and any `IOpusDecoder` / `IWebmDemuxer` dependencies.
- If a native dependency is the cause, either (a) add `brew install` to the `backend / macos-latest` CI step, or (b) switch to a pure-managed decoder (`Concentus` for Opus is an option). Preference: pure-managed — keeps backend portable and CI deterministic.

## 3. Unknown: status of three other jobs

Agent must enumerate the current state of the three remaining jobs before declaring this block done.

- **frontend / ubuntu-latest + macos-latest:** run `npm ci && npm run typecheck && npm run lint && npm test && npm run build` locally in sandbox (ubuntu-equivalent). Report any failure.
- **python / ubuntu-latest + macos-latest:** run `pip install -r requirements.txt -r requirements-dev.txt && ruff check . && pytest` locally in sandbox.
- **dictation-helper / macos-latest:** cannot run in sandbox (AppKit/AVFoundation); pass through to block 3 Mac-validation. The Swift package's `swift build / test` is checked there, not here.

For any previously-unknown failure surfaced, apply the same hypothesis-first analysis as §2.

## 4. Tasks

1. Read `ModelDownloadServiceTests.cs` and `ModelDownloadService.cs`. Identify root cause of the empty `reports`. Fix.
2. Read `DictationPushWebmOpusTests.cs` and the push endpoint. Identify root cause. Fix.
3. Run `dotnet test backend/Mozgoslav.sln -maxcpucount:1 --logger "console;verbosity=normal"` locally. Confirm 152/152 unit + 128/128 integration pass.
4. Run `npm ci && npm run typecheck && npm run lint && npm test && npm run build` in `frontend/`. Fix any failures surfaced.
5. Run `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt && ruff check . && pytest` in `python-sidecar/`. Fix any failures surfaced.
6. Ensure `frontend/package-lock.json` exists and is committed (required by `actions/setup-node@v4` cache).
7. Commit: `fix(ci): restore green for ModelDownloadService progress, DictationPush webm/opus, frontend/python baselines`.
8. Write checkpoint summary at the end of this file (append §8).

## 5. Acceptance criteria

- All four CI jobs green on the v0.8 branch.
- No test is skipped, disabled, or marked `[Ignore]`.
- No native dependency added to backend unless unavoidable; if added, documented in this file and in `README.md`.
- Fixes are regression-safe: each fix has a matching assertion in the test (no "reduce threshold, loosen assertion" shortcuts).

## 6. Non-goals for this block

- New tests. Only fix what is red.
- Refactoring for clarity beyond what the fix requires.
- Changes to `ci.yml` structure unless required by a fix (e.g. adding a cache key).

## 7. Open questions (agent flags if hit)

- If `Concentus` (managed Opus decoder) is needed, is shuka OK with adding that NuGet dependency? Default: yes (pure-managed, small, well-maintained). Agent proceeds; shuka vetoes at checkpoint if not.
- If fixing the `DownloadAsync` progress-report requires changing the service signature, is that a breaking change? Check callers under `src/` — if only the test calls it, free to change. Otherwise coordinate with blocks 2, 4, 7.

## 8. Checkpoint summary (Agent A, 2026-04-17)

### Files changed
- `backend/src/Mozgoslav.Infrastructure/Services/ModelDownloadService.cs` — always emit a final `Progress(received, total, 100)` report after the read loop finishes; guarantees a terminal event for tiny payloads that complete in a single buffer iteration.
- `backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs` — replace `System.Progress<T>` (which posts to the thread pool and races with the awaiter continuation) with a synchronous `IProgress<T>` implementation so the test no longer depends on scheduler timing.
- `.github/workflows/ci.yml` — explicit `apt-get install ffmpeg` / `brew install ffmpeg` step for the backend job on both Linux and macOS runners. `FfmpegPcmDecoder` is exercised end-to-end by `DictationPushWebmOpusTests`, so a missing runner-image binary manifested as a 400 response.
- `python-sidecar/app/models/` (new in git) — the directory has existed on disk since the embed feature, but the `.gitignore` rule `models/` was swallowing it so `common.py` and `schemas.py` were never tracked. Added the module on the branch, including a new `EmbedRequest` / `EmbedResponse` pair the existing `app/routers/embed.py` imports.
- `.gitignore` — carve `python-sidecar/app/models/` out of the generic `models/` exclusion so the pydantic schema module can be tracked (the original rule was aimed at runtime ML-model binaries, not application source code).

### Tests
- Backend unit: `Mozgoslav.Tests` — 152/152 pass locally on Ubuntu with ffmpeg installed.
- Backend integration: `Mozgoslav.Tests.Integration` — 128/128 pass.
- Python sidecar: `python-sidecar` — 22/22 pytest pass, ruff clean (previously 0 tests collected because of the `EmbedRequest` import failure).
- Frontend: `npm install` → node_modules; `npm run typecheck` clean, `npm run lint` clean, `npm test -- --watchAll=false` = 97 tests across 19 suites pass, `WATCHPACK_POLLING=true npm run build` succeeds (vite production bundle).
- Dictation helper (Swift): not runnable in Linux sandbox — macOS-only (AppKit / AVFoundation / ApplicationServices). Verified by shuka on Mac during Block 3 pass.

### Outstanding — flag for Agent B (frontend territory)
- `npm ci` on a clean `node_modules/` currently fails with `Missing: electron-builder-squirrel-windows@25.1.8 from lock file` (plus sub-tree `archiver`, `fs-extra`, `tar-stream`, `zip-stream`, `archiver-utils`, `readdir-glob`). Those are peer deps of `app-builder-lib` that the committed `package-lock.json` declares as peers without materialising the actual `node_modules/electron-builder-squirrel-windows/` entry. `npm install` (which is what the sandbox uses) skips them silently; CI uses `npm ci` and therefore the `frontend` job is currently red on both Linux and macOS.

  This is **not** a lockfile-regen fix (I tried — regenerating produces the same structure). The viable options are (a) add `electron-builder-squirrel-windows@25.1.8` as an explicit devDependency so npm materialises its own entry, (b) replace `npm ci` with `npm install` in `ci.yml` for the frontend job, or (c) upgrade `electron-builder` to a version that emits complete cross-platform deps. Each of those touches `frontend/package.json` or the frontend CI step — Agent B's territory per the block split — so I stopped short and did not commit any frontend change. Agent B to decide and push the fix.

### Deviation from the plan
- The plan hypothesised a native-opus dependency for `DictationPushWebmOpusTests`. Root cause is different: `FfmpegPcmDecoder` shells out to `ffmpeg`, and the binary is absent on a fresh sandbox and not explicitly installed in CI. Fix stays aligned with §2.2 alternative (a): install ffmpeg in CI. No NuGet dependency added; no pure-managed opus decoder introduced.
- The plan's primary hypothesis for `ModelDownloadServiceTests` (threshold-based progress) turned out secondary; the dominant cause is `Progress<T>` thread-pool dispatch racing with the assertion on a 32 KB payload. Both the service and the test were touched because the service-only fix cannot win the race on small payloads either.
- `ModelDownloadService.DownloadAsync(Uri, …)` overload remains as `throw new NotImplementedException()`. It is unreferenced in the codebase; flagging for ADR-009 cleanup in Block 8 rather than extending scope here.
