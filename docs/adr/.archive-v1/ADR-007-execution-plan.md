# ADR-007 — Execution Plan

Operational blueprint for turning ADR-007 into shipped MRs. Agent prompts and wave order live here; business cases and bug catalogue live in `ADR-007-iteration-7.md`.

## Wave overview

| Wave | Purpose | Branch | Base | Agents |
|------|---------|--------|------|--------|
| 1 | Write all 53 BCs red-first per ADR-007 §5 | `shuka/adr-007-tests` | `origin/main` | 4 parallel (backend C# / frontend TS / python / swift) |
| 2 | Implementation MR A — build-fix + critical bugs | `shuka/adr-007-a-build-fix` | `shuka/adr-007-tests` (after Wave 1 merged into main) | 1 developer |
| 3 | Implementation MR C — RAG production restore | `shuka/adr-007-c-rag` | `origin/main` (after A merged) | 1 developer |
| 4 | Implementation MR B — UX coherence pass | `shuka/adr-007-b-ux` | `origin/main` (after C merged) | 1 developer |
| 5 | Implementation MR D — Syncthing full restore + Sync tab | `shuka/adr-007-d-sync` | `origin/main` (after B merged) | 1 developer |
| 6 | Implementation MR E — Dictation reliability | `shuka/adr-007-e-dictation` | `origin/main` (after D merged) | 1 developer |

Merge order is strict: **A → C → B → D → E**. No parallel impl merges.

---

## Wave 1 — Test writing (4 parallel agents, red-first)

### Pre-flight (orchestrator does this once)

```bash
cd /home/coder/workspace/mozgoslav-m7-branch
git worktree add /home/coder/workspace/mozgoslav-m7-tests -b shuka/adr-007-tests origin/main
```

Copy (inside the new worktree) the two canonical docs so agents have them:
- `docs/adr/ADR-007-iteration-7.md`
- `docs/adr/ADR-007-execution-plan.md`

### Universal rules (apply to all 4 agents)

1. **Red-first**: tests must compile (C# / TS strict / Swift) or import (Python) and must fail for the *right* reason — missing symbol, missing endpoint, specific assertion mismatch — not environment error.
2. **No implementation code.** Only test files. If a test needs a production type that doesn't exist yet, reference it — compile/type-check failure is the expected red state.
3. **No cross-stack edits.** Backend agent does not touch `frontend/`, etc.
4. **No new dependencies.** If a BC genuinely needs a new package, flag it in the MR description as an Open Item for the orchestrator — do not `dotnet add package` / `npm install` / `pip install` yourself.
5. **Fixture strategy per ADR-007 §5.4** — use `TestDatabase`, `ApiFactory`, WireMock, Testcontainers exactly as specified. Never hit the real network.
6. **One commit per BC area** (≤ 10 tests per commit) so the orchestrator can review.
7. **Commit message format**: `test(<stack>): BC-XXX..BC-YYY — <short topic> (red)`.
8. **Skills available**: `superpowers:test-driven-development` (rigid — follow), `superpowers:writing-skills` (optional), `superpowers:verification-before-completion` (before final commit).

### Agent-1 prompt — Backend C# tests

```
You are the Wave-1 backend-C# test-writing agent for mozgoslav Iteration 7.

Worktree: /home/coder/workspace/mozgoslav-m7-tests
Branch: shuka/adr-007-tests (already prepared by orchestrator)
Read first (mandatory):
- docs/adr/ADR-007-iteration-7.md  (business cases + test plan catalogue)
- docs/adr/ADR-007-execution-plan.md  (this file; universal Wave-1 rules)
- backend/CLAUDE.md  (conventions)

Your scope: every BC row in ADR-007 §5.1 where the Stack column is `backend` or `backend + frontend` or `backend + electron` — write the backend half only. BC IDs approximately: BC-005, BC-006, BC-008, BC-009, BC-010, BC-012, BC-013, BC-015, BC-016, BC-017, BC-021, BC-022 (backend part), BC-024, BC-025 (backend part), BC-027, BC-028, BC-029, BC-030, BC-031, BC-033 (backend part), BC-034, BC-036, BC-037, BC-039 (backend part), BC-042, BC-043, BC-044, BC-045, BC-048, BC-049, BC-051, BC-052.

Conventions (enforced by project):
- MSTest [TestClass]/[TestMethod] + FluentAssertions + NSubstitute.
- Unit tests under backend/tests/Mozgoslav.Tests/<Layer>/<Class>Tests.cs.
- Integration tests under backend/tests/Mozgoslav.Tests.Integration/<FeatureOrEndpoint>Tests.cs using existing ApiFactory + TestDatabase.
- One class per file. Sealed. No primary constructors. Traditional ctors with readonly fields.
- TargetFramework net10.0, LangVersion 14, Nullable enable, TreatWarningsAsErrors=true.
- Run tests with: dotnet test -maxcpucount:1 --no-restore.

Fixture choices:
- SQLite: existing TestDatabase (backend/tests/Mozgoslav.Tests.Integration/TestDatabase.cs).
- LLM HTTP endpoints (LM Studio / OpenAI-compat / Anthropic / Ollama): WireMock.Net (already in test deps; verify).
- Syncthing REST: WireMock.Net for unit; Testcontainers syncthing/syncthing:latest image for BC-048 + BC-049 only.
- Filesystem: Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N")).

Deliverables:
1. New test files at the exact paths listed in ADR-007 §5.1.
2. Red-first: every test compiles but fails on assertion or "missing endpoint/symbol" (via HttpClient 404, type error, or assertion mismatch).
3. One commit per BC area with message format `test(backend): BC-XXX..BC-YYY — <topic> (red)`.
4. Short report file `wave1-backend-<short-id>.md` at worktree root summarising which BCs you covered, which you left UNCOVERED with reason, and any BC that required a new NuGet package (flagged as Open Item — not installed).

Hard constraints:
- No implementation changes in src/. Tests only in tests/.
- No git push. Commit locally; orchestrator pushes and opens MR.
- No installing NuGet packages without orchestrator approval.
- 2-strike rule on any blocked step.

Skills: superpowers:test-driven-development (mandatory), superpowers:verification-before-completion (before final commit).

Begin by reading the three docs listed above. Then write tests BC-by-BC in the order they appear in §5.1. End with a short text summary.
```

### Agent-2 prompt — Frontend TS tests

```
You are the Wave-1 frontend-TS test-writing agent for mozgoslav Iteration 7.

Worktree: /home/coder/workspace/mozgoslav-m7-tests
Branch: shuka/adr-007-tests
Read first: ADR-007-iteration-7.md + ADR-007-execution-plan.md + frontend/CLAUDE.md + frontend/package.json (verify jest + React Testing Library + redux-saga-test-plan are deps).

Your scope: every BC row where Stack column is `frontend`, `electron`, `backend + frontend` (frontend half), `backend + electron` (electron half), `frontend (visual / perf)`. BC IDs approximately: BC-002, BC-003, BC-004, BC-011, BC-014, BC-018, BC-019, BC-020, BC-022 (frontend part), BC-023, BC-025 (frontend part), BC-032, BC-033 (frontend part), BC-035, BC-038, BC-039 (frontend part), BC-040, BC-041, BC-046, BC-047, BC-050, BC-053.

Conventions:
- Feature tests co-located: frontend/src/features/<Feature>/__tests__/<File>.test.tsx.
- Electron main-process tests: frontend/__tests__/electron/<File>.test.ts — mock electron via jest.mock("electron").
- Hooks: frontend/__tests__/hooks/.
- Theme/snapshot: frontend/__tests__/styles/.
- Jest + React Testing Library + redux-saga-test-plan.
- TypeScript strict: type errors at test-collect time count as red.
- Run: npm --prefix frontend test.

Fixture patterns:
- HTTP mocks: use `jest.spyOn(global, 'fetch')` or msw if already present (check frontend/package.json). Default: jest.fn with typed resolved values.
- Redux/Saga: redux-saga-test-plan `expectSaga(...).put(...).provide([...]).run()`.
- Electron mocking: jest.mock("electron", () => ({ BrowserWindow: ..., Tray: ..., ... })).

Deliverables:
1. New test files at paths in ADR-007 §5.1.
2. Red-first (see execution-plan universal rules).
3. Commits `test(frontend): BC-XXX..BC-YYY — <topic> (red)`.
4. Short report `wave1-frontend-<id>.md` at worktree root.

Hard constraints: same as backend. No impl changes in src/. No npm install without approval. Node is available; `npm install` in an existing tree to sync dependencies is OK only if package.json is unchanged.

Skills: superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Agent-3 prompt — Python sidecar tests

```
You are the Wave-1 python-sidecar test-writing agent.

Worktree: /home/coder/workspace/mozgoslav-m7-tests
Branch: shuka/adr-007-tests
Read first: ADR-007-iteration-7.md + ADR-007-execution-plan.md + python-sidecar/CLAUDE.md.

Your scope: any BC row where Stack column includes `sidecar`. In ADR-007 Iteration-7 scope the sidecar is touched mainly by §0.3 RAG restoration (the `/embed` endpoint comes back). Also any test required by BC row with Stack `backend` whose integration test hits the sidecar via WireMock — those are the backend agent's job, not yours.

If the sidecar BCs list is small (it will be; most work is in C# + frontend), your deliverable may be as short as 3-10 tests. That's correct — under-scope, not over-scope.

Conventions:
- pytest + fastapi.testclient.TestClient.
- Tests live at python-sidecar/tests/test_<name>.py.
- Existing examples: python-sidecar/tests/test_health.py, test_cleanup.py.
- python-sidecar/pyproject.toml carries deps; requirements-dev.txt has the dev set.
- Run: cd python-sidecar && python -m pytest -q (ensure venv activated; agent may create one if not present via python3 -m venv .venv).

Deliverables:
1. New tests at python-sidecar/tests/test_embed.py (covers /embed happy path + deterministic-fallback + dim=384) or similar.
2. Red-first: since /embed is deleted on branch and orchestrator plans to restore in Wave 3, the test is red on origin/main today — exactly the TDD state we want.
3. Commit `test(sidecar): BC-XXX — /embed contract tests (red)`.
4. Short report `wave1-python-<id>.md`.

Hard constraints: no pip install without orchestrator approval; sidecar deps must not drift.

Skills: superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Agent-4 prompt — Swift helper tests

```
You are the Wave-1 swift-helper test-writing agent for mozgoslav Iteration 7.

Worktree: /home/coder/workspace/mozgoslav-m7-tests
Branch: shuka/adr-007-tests
Read first: ADR-007-iteration-7.md + ADR-007-execution-plan.md + helpers/MozgoslavDictationHelper/Package.swift + existing tests under helpers/MozgoslavDictationHelper/Tests/.

Your scope: BC rows where Stack column is `swift`. Approximately: BC-007 (AX timeout falls back to CGEvent) + any BC that references InjectionStrategy or FocusedAppDetector in §5.1.

The sandbox does NOT have Swift installed. You cannot run `swift test`. Your job is to write the tests as source files — execution happens on the user's macOS host.

Conventions:
- XCTest.
- Tests at helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/<Name>Tests.swift.
- Existing examples: JsonRpcTests.swift, InjectionStrategyTests.swift (may have been deleted in the branch — verify in your worktree; restore test file skeletons as needed).
- Package.swift already declares the target; verify it still does.

Deliverables:
1. New / restored tests at the paths above.
2. Red-first by construction: tests reference public symbols that either already exist (assertion may pass) or need to be added in later MRs (Swift compiler error — the red state).
3. Commit `test(swift): BC-XXX — <topic> (red)`.
4. Short report `wave1-swift-<id>.md` noting which tests could not be validated because Swift is absent from the sandbox.

Hard constraints: no Package.swift modifications beyond a clean test-target addition if needed.

Skills: superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Wave 1 acceptance

Orchestrator verifies before opening the tests MR:

- [ ] `cd /home/coder/workspace/mozgoslav-m7-tests && git log --oneline shuka/adr-007-tests ^origin/main` shows one commit per BC group, signed, conventional format.
- [ ] `dotnet build backend/Mozgoslav.sln -c Debug -maxcpucount:1` succeeds (tests compile; red assertions are fine — compile errors are not).
- [ ] `npm --prefix frontend run typecheck` succeeds (TS strict green).
- [ ] `cd python-sidecar && python -m pytest --collect-only` lists the new tests.
- [ ] No files outside `backend/tests/`, `frontend/src/features/**/__tests__/`, `frontend/__tests__/`, `python-sidecar/tests/`, `helpers/MozgoslavDictationHelper/Tests/`, `wave1-*.md` were modified.
- [ ] Each wave1-*.md report lists UNCOVERED BCs with reason + any Open Item flagged for orchestrator.

Then one MR (or four) `shuka/adr-007-tests → main`. Merge with CI failing on red assertions — document this as expected in the MR description. Next waves turn reds to green.

---

## Wave 2 — MR A (build-fix + critical bugs)

### Scope (from ADR-007 §2)

1. **N1** — fix 3 IDISP analyzer violations in `backend/src/Mozgoslav.Infrastructure/Services/FfmpegAudioRecorder.cs`. Make `dotnet build -c Release -maxcpucount:1` green.
2. **Bug 2 + 34** — Whisper default chain. Update `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs[0].Url` to user-hosted GitLab release URL for `antony66` ggml. Align filename with `AppPaths.DefaultWhisperModelPath`. Restore `ModelDownloadService` + `POST /api/models/download` + progress channel (see Wave 4 UX for the progress bar; backend channel lands here).
3. **Bug 6** — Syncthing probe guard. `SyncthingHttpClient` must not probe until `settings.SyncthingBaseUrl` is populated. Full lifecycle restore is Wave 5; here only the guard.
4. **Bug 7** — Add value-comparers for 8 collection converters in `backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs` (`ProcessedNote.ActionItems/Decisions/KeyPoints/Participants/Tags/UnresolvedQuestions`, `Profile.AutoTags`, `Transcript.Segments`).
5. **Bug 8** — De-duplicate `SQLite schema ensured` + `Seeded 3 built-in profiles` log lines. Resolve Kestrel "Overriding address(es)" warning (remove one of the duplicate host configurations in `Program.cs`).
6. **Bug 9** — Fix logs-path resolution. `GET /api/logs` + `GET /api/logs/tail` must scan `AppPaths.Logs`, same directory Serilog writes to.
7. **Bug 10 + 11** — Profiles empty despite seeding. Root-cause expected in `AppPaths.Database` resolution mismatch between seeding and API runtime. Confirm single DB path, fix.
8. **Bug 19** — Queue cancel button affordance in `frontend/src/features/Queue/*` — wire existing `DELETE /api/queue/{id}` (D-9 backend shipped; UI missing).
9. **Bug 20** — Queue startup reconciliation: on `QueueBackgroundService` start, reset `Running` jobs to `Queued` (or `Failed` with reason "app restarted"). BC-016 test turns green.
10. **LogsEndpoints → LogsController rewrite (user directive).** Delete `backend/src/Mozgoslav.Api/Endpoints/LogsEndpoints.cs`. Add `backend/src/Mozgoslav.Api/Controllers/LogsController.cs` as MVC `[ApiController]` + `[Route("api/logs")]`. Wire `builder.Services.AddControllers()` + `app.MapControllers()` in `Program.cs` alongside existing Minimal API endpoints (coexistence, not full replacement — this directive is local to Logs only; other endpoint modules stay Minimal API unless the user extends the directive). Existing BC-042 (`LogsControllerTests.cs::Tail_Default_ReturnsLines`) keeps its intent but lives at the new Controller route; assertion on status + body shape unchanged.

11. **Primary-constructor sweep (user directive).** Audit every branch C# file for primary-constructor syntax (`public sealed class Foo(IBar bar, IBaz baz) { ... }`) and convert to traditional form with explicit `private readonly` fields + a plain constructor. Targets are any `*.cs` file under `backend/src/` and `backend/tests/`. The project's `backend/CLAUDE.md` already forbids primary constructors; the sweep closes the audit loop. Grep pattern: `class [A-Z]\w*(\s*:\s*[A-Z]\w*)?\s*\(` across `.cs` files — narrow with manual review. Tests the Wave-1 agents write MUST use traditional constructors too.

### Turn tests green (from Wave 1)

All A-scope BCs' tests are red on main after Wave 1 merge. This MR turns them green. If a test assertion needs to change to be "correct" — stop, escalate; do not silently rewrite.

### Agent prompt skeleton

```
You are the Wave-2 implementation agent for mozgoslav Iteration 7 MR A (build-fix + critical bugs).

Worktree: /home/coder/workspace/mozgoslav-m7-a
Branch: shuka/adr-007-a-build-fix (off origin/main; Wave 1 tests already landed on main).

Read first: ADR-007-iteration-7.md §2 + execution-plan.md Wave 2 scope + CLAUDE.md (root + backend + frontend).

Your job: turn every Wave-1 A-scope test green by implementing the 9 items above.

Red → green rules:
- Do not modify any test file beyond trivial fixture cleanup (path renames, DI). If an assertion looks wrong, escalate to orchestrator via MR description Open Item — do not silently rewrite.
- One commit per A-scope item. Conventional: feat(<area>): A<N> — <topic>.
- Dotnet build + test + frontend typecheck must be green before the final commit.

Skills: superpowers:systematic-debugging (for root-cause work on bugs 10+11), superpowers:test-driven-development (red→green discipline), superpowers:verification-before-completion (before final commit), superpowers:requesting-code-review (self-review before MR).
```

### Wave 2 acceptance

- `dotnet build -c Release -maxcpucount:1` green.
- `dotnet test -maxcpucount:1 --no-restore` green on all A-scope BC tests.
- `npm --prefix frontend run typecheck && lint && test` green.
- `git status --short` clean on non-test files outside the listed scope paths.

---

## Wave 3 — MR C (RAG production restore)

### Scope (from ADR-007 §2.3)

1. Restore Python sidecar `/embed` endpoint (`python-sidecar/app/routers/embed.py` or equivalent) with `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (or equivalent multilingual ≤ 500 MB). Retain deterministic SHA-256 BoW fallback for dev boxes without PyTorch. 384-dim L2-normalised output (stable contract).
2. Restore backend Application layer: `IRagService`, `IEmbeddingService`, `IVectorIndex`, `NoteChunk`, `NoteChunker`, `RagService`.
3. Restore Infrastructure layer: `PythonSidecarEmbeddingService`, `SqliteVectorIndex` (via `sqlite-vec`). Drop `BagOfWordsEmbeddingService` + `InMemoryVectorIndex` (prod-only mandate per §0.3; keep deterministic fallback in sidecar).
4. Restore API: `POST /api/rag/reindex`, `POST /api/rag/query` (citations) at `backend/src/Mozgoslav.Api/Endpoints/RagEndpoints.cs`. Route LLM synthesis through `LlmProviderFactory` → user's `openai_compatible` provider.
5. EF migration (non-destructive): add `embedding BLOB NULL`, `embedding_dim INT NULL` columns on `transcript_segments` or a new `note_embeddings` table. Existing rows remain valid.
6. Frontend: new `frontend/src/features/RagChat/*` full-page surface. Single chat input with placeholder "Привет, введи сюда…", message stream rendering, streamed answer + citations clickable to source notes. Animations: subtle enter/exit + typing indicator (AnythingLLM-style). Use `motion` package (already on branch) with LazyMotion. Remove bubbles+Ask-button paradigm from the deleted `81afb1d` commit.
7. Turn Wave-1 C-scope tests green: BC-036 (provider factory), BC-039 (if Ollama BC kept), and any `rag`-related integration tests.

### Agent prompt skeleton

```
You are the Wave-3 implementation agent for mozgoslav Iteration 7 MR C (RAG production restore).

Worktree: /home/coder/workspace/mozgoslav-m7-c
Branch: shuka/adr-007-c-rag (off origin/main after MR A merged).

Read first: ADR-007-iteration-7.md §2.3 + execution-plan.md Wave 3 + relevant historical code in git history of main before 4cefb4b deletion (restore pattern, don't re-invent).

Scope: 7 items listed in Wave 3 scope above.

Hard constraints:
- NuGet: sqlite-vec requires a net package — propose in MR description if absent; do not install silently.
- Python: sentence-transformers is heavy — load-on-demand singleton + deterministic fallback per python-sidecar/CLAUDE.md pattern.
- Do not modify tests (turn them green).

Skills: superpowers:test-driven-development, superpowers:systematic-debugging (for index/embedding wiring), superpowers:writing-plans (RAG is multi-file, plan before coding), superpowers:requesting-code-review, superpowers:verification-before-completion.
```

### Wave 3 acceptance

- `dotnet build` + `dotnet test` green.
- Python `pytest -q` green (deterministic-fallback path verified; real-model path skipped on dev boxes without PyTorch).
- Frontend typecheck + test + lint green.
- `POST /api/rag/query` returns `{answer, citations[]}` with a live mock of LM Studio endpoint.

---

## Wave 4 — MR B (UX coherence pass)

### Scope (from ADR-007 §2.5)

1. **Typography bump** — `frontend/src/styles/theme.ts` body-sm ≥ 14 px, weights revisited. Snapshot test BC-041 turns green.
2. **Top-bar spacing (bug 18)** — Dashboard header layout fix; brand block no longer overlapped by action buttons.
3. **Back-button polish (bug 16)** — fonts + icon replaced; used across Onboarding.
4. **Queue cancel UI** — already landed in MR A; verify still green here.
5. **Persistent queue** — landed in MR A; verify.
6. **Queue resume from checkpoint (bug 21, BC-017)** — new: checkpoint write every ~5 minutes of wall-clock transcription into `Transcript.Segments.CheckpointAt` (new column; non-destructive EF migration). Resume path reads last checkpoint on restart.
7. **Get-Started mandatory gating (bug 25)** — audit `frontend/src/features/Onboarding/*`. Each step transitions only when precondition met:
   - LLM step: endpoint ping via `GET /api/health/llm` succeeds (or user skipped).
   - Models step: chosen model file present on disk (folder-pick auto-detect) OR catalogue URL download completed with progress.
   - Permissions (macOS): mic/AX/Input-Monitoring system prompts granted (native check via Swift helper stdin/stdout JSON-RPC).
   - All optional steps expose subtle grey Skip button (≤ 60% opacity of primary CTA).
   - Welcome step gets a meaningful brand animation (subtle, not loud; `motion` library with `LazyMotion` strict).
8. **Model download progress bar (bug 26)** — frontend component on Models step + Settings Models page. Backend channel landed in MR A; frontend subscribes.
9. **Obsidian tab first-class (bug 22)** — `frontend/src/features/Obsidian/*` promoted to a sidebar entry. Two buttons:
   - "Sync all" — POST `/api/obsidian/export-all` (new endpoint, extend `ObsidianEndpoints.cs`) — bulk-exports every un-exported `ProcessedNote`.
   - "Разложить по PARA" — POST `/api/obsidian/apply-layout` (new endpoint) — applies `FolderMapping` + `VaultExportRule` from ADR-001 domain entities (if entities don't exist yet, add them as plain domain records in `Mozgoslav.Domain.Entities` with migration).

### Agent prompt skeleton

```
You are the Wave-4 implementation agent for mozgoslav Iteration 7 MR B (UX coherence).

Worktree: /home/coder/workspace/mozgoslav-m7-b
Branch: shuka/adr-007-b-ux (off origin/main after MR C merged).

Read first: ADR-007-iteration-7.md §2.5 + execution-plan.md Wave 4 + frontend/CLAUDE.md.

Scope: 9 items listed above.

Design references for Get-Started animation: subtle, not loud; 300-450 ms ease-out; never block user interaction after entry complete. Reference Meetily Summary surface for RagChat layout; inherit animation vocabulary from AnythingLLM's chat (typing indicator, streamed tokens fade-in) but do not adopt their full framework.

Hard constraints:
- Backend changes only for Obsidian endpoints (+ FolderMapping domain if needed). Everything else is frontend.
- Turn green: BC-004, BC-018, BC-019, BC-020, BC-040, BC-041, and any Obsidian BCs from §5.1.

Skills: superpowers:frontend-design (if available; otherwise superpowers:writing-plans), superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Wave 4 acceptance

- Frontend lint + typecheck + test green.
- `dotnet build` + `dotnet test` green (new Obsidian endpoints covered by new BCs or existing `ObsidianSetupTests`).
- Manual UX check on orchestrator's side: Get-Started gating blocks forward without completed step; Skip is visually subordinate; Obsidian tab renders, Sync-all triggers export.

---

## Wave 5 — MR D (Syncthing full restore + Sync tab)

### Scope (from ADR-007 §2.4)

1. Restore `backend/src/Mozgoslav.Application/Interfaces/ISyncthingClient.cs`, `SyncthingEvent.cs`.
2. Restore `backend/src/Mozgoslav.Infrastructure/Services/SyncthingHttpClient.cs`, `SyncthingConfigService.cs`, `SyncthingFolderInitializer.cs`, `SyncthingSseEventParser.cs`.
3. Restore `backend/src/Mozgoslav.Infrastructure/Seed/SyncthingVersioningVerifier.cs` (ADR-004 R8).
4. Add `SyncthingLifecycleService : IHostedService` — spawns bundled Syncthing binary with **random free local port** + generates API-key on first run and persists to `settings.db` + graceful shutdown via REST. Remove bug 6's guard from MR A once lifecycle is present and ordered correctly.
5. Restore `backend/src/Mozgoslav.Api/Endpoints/SyncEndpoints.cs` — `GET /api/sync/status`, `GET /api/sync/health`, `GET /api/sync/pairing-payload`, `POST /api/sync/accept-device`, SSE bridge `GET /api/sync/events` mapped from `/rest/events`.
6. Electron-side: `frontend/electron/utils/syncthingLauncher.ts` — already present; verify it's wired to lifecycle signalling; resource extraction from `extraResources` path.
7. Frontend `frontend/src/features/Sync/*` (new tab, sibling to SyncPairing feature):
   - Devices sub-view: paired devices list with state (connected / disconnected / last-seen).
   - Folders sub-view: 3-folder status table (completion %, conflicts badge) from `/api/sync/status`.
   - Conflicts sub-view: list of `.sync-conflict-*` files from each folder; resolution still manual via Finder (documented in `docs/sync-conflicts.md`).
   - Settings toggle row: enable/disable global Syncthing.
8. Restore default `.stignore` templates per ADR-004 R7 in `SyncthingFolderInitializer`.
9. Turn Wave-1 D-scope tests green: BC-048, BC-049, BC-050, `SyncthingSseEventParserTests` suite, `SyncthingVersioningVerifierTests`, `SyncthingHttpClientTests`.

### Agent prompt skeleton

```
You are the Wave-5 implementation agent for mozgoslav Iteration 7 MR D (Syncthing full restore).

Worktree: /home/coder/workspace/mozgoslav-m7-d
Branch: shuka/adr-007-d-sync (off origin/main after MR B merged).

Read first: ADR-007-iteration-7.md §2.4 + execution-plan.md Wave 5 + ADR-003 (.archive/adrs/ADR-003-syncthing-integration.md on the main-reference worktree).

Scope: 9 items listed above.

Historical code reference: the deleted implementations live in git history of main (pre-branch). Use them as starting point — don't re-invent. Commands to retrieve:
  git show <pre-deletion-sha>:backend/src/Mozgoslav.Infrastructure/Services/SyncthingHttpClient.cs

Hard constraints:
- Random port logic: bind-test-release an available port in `SyncthingLifecycleService` before spawning `syncthing serve`.
- API-key generation: cryptographically random 32-byte hex; stored in settings.db, passed to spawned binary via `--gui-apikey=`.
- Turn green: all Syncthing BCs + restore the deleted test files as brand-new tests.

Skills: superpowers:systematic-debugging (lifecycle bugs are notoriously subtle), superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Wave 5 acceptance

- All Syncthing BCs green (Testcontainers `syncthing/syncthing:latest` real path + WireMock unit path both covered).
- Startup log no longer emits `Connection refused (127.0.0.1:8384)` — lifecycle service spawns binary on random port first.
- Electron main + backend health `/api/sync/health` both report ready after ~3 s boot.

---

## Wave 6 — MR E (Dictation reliability)

### Scope (from ADR-007 §2)

1. **Bug 3** — Dashboard record button end-to-end. Decision from §2: keep the button, wire audio-push from the browser microphone (`navigator.mediaDevices.getUserMedia`) to the backend session endpoint, chunked as the existing Electron mouse-5 flow does. `frontend/src/features/Dashboard/*` + `frontend/src/components/BrainLauncher/*` + `frontend/src/store/slices/recording/saga/*`.
2. **Bug 14** — Folder picker + auto-detect `.bin` / `.gguf` for models. Settings Models page + Get-Started Models step (Wave 4 stubs in UI — this Wave wires the scan endpoint). Backend: `POST /api/models/scan` (new) reads the user-selected directory, lists files, registers detected ones into `settings.db` as non-catalogue model entries (`source: "local"`).
3. **N3** — Per-profile transcription prompt wiring. `DictationSessionManager.StartAsync` prefers the selected profile's `transcriptionPromptOverride` over the global `Dictation.Vocabulary`. BC-030 turns green.
4. **Restore ADR-004 R4** — `backend/src/Mozgoslav.Infrastructure/Services/IdleResourceCache.cs`. Whisper model unload after `Dictation.ModelUnloadMinutes` of inactivity. BC-008 turns green.
5. **Restore ADR-004 R5** — crash-recovery PCM buffer. `DictationSessionManager` opens FileStream to `~/Library/Application Support/Mozgoslav/temp/dictation-{sessionId}.pcm`; appends every incoming AudioChunk; deletes on successful stop-and-inject; on startup logs orphan files as WARN. BC-009 turns green.
6. **Electron overlay** — verify tray icon asset path + overlay `focusable: false` + click passthrough per ADR-002 D6. Bug 12 (tray missing + overlay non-clickable) resolves as part of this sweep.

### Agent prompt skeleton

```
You are the Wave-6 implementation agent for mozgoslav Iteration 7 MR E (Dictation reliability).

Worktree: /home/coder/workspace/mozgoslav-m7-e
Branch: shuka/adr-007-e-dictation (off origin/main after MR D merged).

Read first: ADR-007-iteration-7.md §2 + execution-plan.md Wave 6 + ADR-002 + ADR-004.

Scope: 6 items listed above.

Historical code reference: IdleResourceCache + crash-recovery paths existed on main before 4cefb4b deletion; retrieve with git show and adapt.

Hard constraints:
- Electron tray asset: verify the resolved path exists in the packaged app; fallback to `png` if the bundled `.icns` missing.
- Browser audio capture: CSP already allows localhost; verify MediaRecorder → backend chunk POST is not CORS-blocked.
- Turn green: BC-004, BC-008, BC-009, BC-030, BC-033 (backend part if not already green from Wave 4).

Skills: superpowers:systematic-debugging, superpowers:test-driven-development, superpowers:verification-before-completion.
```

### Wave 6 acceptance

- All E-scope BCs green.
- Manual on orchestrator's side: record button on Dashboard starts → overlay shows → stop → transcript lands in a new ProcessedNote.
- Idle-unload: Whisper factory disposed after 10 min idle (observable in logs).
- Crash-recovery: kill app mid-session → relaunch → orphan PCM file logged.

---

## Cross-wave orchestrator rules

1. **No MR merges without green CI.** `dotnet build -c Release`, `dotnet test`, `npm --prefix frontend run typecheck && lint && test`, `python -m pytest -q` must all pass.
2. **One MR per wave.** Four Wave-1 MRs are acceptable if the four agents hand in separate branches; otherwise one.
3. **Merge order A → C → B → D → E is strict.** No skipping.
4. **Orchestrator reviews each MR** before merge — uses `superpowers:code-reviewer` agent for a second opinion on wave scopes C, D, E (largest).
5. **Never rewrite a Wave-1 test** silently in a later Wave. Either the test is wrong (escalate) or the implementation makes it green.
6. **Context hygiene**: ADR-007 is the source of truth. If any wave surfaces a deviation, amend ADR-007 first, then execute.
7. **All waves respect the root CLAUDE.md** (`.claude/CLAUDE.md`) agent rules and stack-specific CLAUDE.md files.
