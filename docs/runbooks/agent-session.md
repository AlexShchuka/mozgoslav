# Runbook — AI coding agent session against this repo

End-to-end flow for a session where an AI agent (Claude Code, Codex, Cursor, …) does implementation work. Humans run this; agents follow the rules in `AGENTS.md`.

## Bootstrap (mandatory, first action)

A fresh checkout has empty `.git/hooks/`. Without lefthook installed, pre-commit auto-format (prettier / eslint / dotnet-format) does NOT run, and CI rejects the push for cosmetic drift. This is the single biggest source of "agent-gate.sh green locally, CI red remotely" mismatches.

```bash
which lefthook                                  # if empty:
sudo npm install -g lefthook
lefthook install                                # writes .git/hooks/{pre-commit,commit-msg,pre-push}
ls .git/hooks/pre-commit && echo "✓ ready"      # verify
```

`git worktree add` directories share `.git/hooks` with the main repo — install once, all worktrees covered.

If hook permissions fail (`open .git/info/lefthook.checksum: permission denied` on Coder/multi-user environments), `sudo chown -R $USER:$USER .git/info .git/hooks` and retry.

## Pre-session

- Confirm the task: one logical change per session. Split ambiguous asks into separate sessions.
- Decide branch name: `<username>/<kebab-slug>` off `main`.

## In-session rules the agent must follow

- Boundaries live in `AGENTS.md` / `CLAUDE.md`. Re-read them at the start of every non-trivial session.
- New backlog / bug / shipped decision = open a GitHub Issue via `.github/ISSUE_TEMPLATE/*.yml`. Do not add markdown under `docs/features/`.
- No version bumps, no telemetry, no backwards-compat shims unless the task says so.
- No `// …` / `/* … */` / `///` / `TODO` / `FIXME` / `HACK` in committed code.
- No inline JSX styles, no CSS modules, no Tailwind inside `src/`. Only `styled-components` with theme tokens from `frontend/src/styles/theme.ts`.
- No primary constructors in C#. No `#region`. No blocking `await` inside a saga.
- Architectural decision / cross-stack contract change → ask before implementing.

## Local gate (matches CI)

```bash
bash scripts/agent-gate.sh               # full local reproduction of CI
bash scripts/agent-gate.sh backend       # scoped: backend | frontend | python | native | verify
```

Do not push until `agent-gate.sh` is green. CI will re-run the same gates on the PR.

## Commit → push → PR

```bash
git add -A
git commit -m "<type>(<scope>): <subject>"   # conventional commits, header ≤ 100

git push -u origin <username>/<slug>

gh pr create --base main --head <branch> \
  --title "<type>(<scope>): <subject>" \
  --body-file <(cat <<'EOF'
## What

- …

## Why

closes #NNN

## Risk

…

## Test plan

- [ ] bash scripts/agent-gate.sh green locally
- [ ] …
EOF
)
```

- PR title is linted against `@commitlint/config-conventional` in `validate / commitlint`.
- Squash-merge only. The PR title becomes the commit message on `main`.

## Post-merge hygiene

- Close related Issues via `closes #N` in the PR body, or manually after merge.
- If the change ships architecture that deserves a robot-style decision record → open a new Issue via `.github/ISSUE_TEMPLATE/decision.yml`.

## Session failure modes

- Agent emits a chain of build→fix→build→fix → stop the chain. One build per iteration, not one per file.
- Agent suggests bumping a package to fix a vulnerability warning → reject. Renovate owns dependency updates; open a `type/backlog` Issue if the warning is load-bearing.
- Agent cannot reach a rule's intent → follow the letter of the rule, surface the tension in the PR description, do not silently override.

## Reproducing this session's flow

This repo's first full agent-driven PR bundled tooling migration + DMG bundling + UI backlog sweep + agent manual rewrite. The same pattern is repeatable:

1. Plan: 1 PR = 1 focused change. Oversize asks get split before implementation, not during.
2. Pre-work: `ls .github/ISSUE_TEMPLATE/` + re-read `AGENTS.md`. Note Boundaries / Do-not / Never.
3. Work: edit → `bash scripts/agent-gate.sh <stack>` → commit. No intermediate full builds.
4. Verify: one full `bash scripts/agent-gate.sh` before push.
5. Hand-off to human: agent prints the branch name + PR body draft; human runs `git push` and `gh pr create`.

---

# Autonomous overnight pipeline (1..N issues)

End-to-end algorithm for an unattended multi-issue run where one orchestrator (typically Claude Opus 1M-context) directs multiple `@developer` subagents in parallel worktrees and produces ONE consolidated PR. Used when the human is asleep, can't review mid-flight, and accepts manual verification + merge after the run.

Single-session flow (above) covers `1 issue, 1 agent, 1 commit`. This section covers `N issues, M agents, K blocks → 1 PR`. The skeleton is generic; per-run pipelines (e.g. `today-session-results/mozgoslav-night-pipeline-<date>.md` outside the repo) project this skeleton onto specific issues.

## When to use which

| Mode | Use when |
|---|---|
| Single-session (above) | One logical change, human present, ≤1h work, no cross-stack contracts |
| Autonomous overnight | 5..15 issues, human asleep / unavailable, accepts post-run review, willing to triage failures |

If you have 1..4 issues: stack of single-sessions is usually safer. Autonomous shines at 6..14 — too many for one session, too few to need multi-PR ceremony.

## Pre-run human decisions (the gates)

Before composing the per-run pipeline, the human MUST settle:

1. **Scope** — which issues / bugs are in this run. List by `#N` plus brief titles. Verify all open + valid milestone (or explicit override). Heavy or risky issues (release pipeline, new infrastructure, native rewrites) usually defer.
2. **Bug fix depth** — minimal (just unblock; smallest diff) vs proper (full refactor + tests + ADR). Mixing kinds in one run is fine if each bug is tagged.
3. **Vision/code reconciliation** — yes or no. If yes, orchestrator runs the reconciliation step (below) per issue before scoping a block; if no, agents implement as written and only flag blocking conflicts.
4. **Native-platform code policy** — for code agents can't compile in the sandbox (Swift, Win32, kernel modules). Options: strict-defer (out of scope), write-only with explicit «manual-verify-required» flag, research-first via WebSearch/WebFetch + clear instructions for the human.
5. **New-deps policy** — strict no-new-deps, allowed-with-rationale, whitelist (well-known plugins only). Renovate still owns version bumps.
6. **Pre-existing test failure triage** (when zero-failures policy is in scope) — fix-all, ignore-with-issue-all, case-by-case with a time cutoff.
7. **Architectural forks inside an issue** (e.g. «two endpoints, pick one») — agent picks with rationale, OR human decides upfront.
8. **PR strategy** — one mega-PR (default for autonomous), split-by-block, split-by-stack. Multi-PR runs need stacked-branch discipline (see `feedback_stacked_mr_branching` patterns).
9. **Time budget** — hard cap. At cap, deliver what's done + file remaining as new issues. Default 8h.

These are NOT clarified mid-flight (memory: `feedback_no_questions_during_autonomous_pipeline`). They're contract.

## Vision/code reconciliation (per issue, when enabled)

Before scoping any block, for each issue:

```bash
gh issue view N --repo <owner>/<repo> --json title,body,labels,milestone,createdAt
```

Then read in this order:
1. The issue body.
2. Vision sections relevant to the issue scope (`docs/product-vision*.md`, `docs/adr/ADR-*.md`).
3. `git log --oneline -20 -- <relevant paths>` — has work shipped recently?
4. Recent ADRs in the same epic / scope.

Tag the issue:

| Tag | Meaning | Action |
|---|---|---|
| `PROCEED` | Issue is current and accurate | Implement as written |
| `RE-SCOPE` | Issue has stale assumptions; new scope needed | Note delta in agent prompt; implement adjusted scope |
| `CLOSE-AS-SHIPPED` | Work is already done elsewhere | Cite commit SHA + file:line; close issue post-merge with comment |
| `SKIP` | Issue conflicts with current architecture | Cite reason; file follow-up if work is still needed in another shape |

**Never silent-skip**. Every reconciliation tag has evidence (file:line, commit SHA, vision section).

`CLOSE-AS-SHIPPED` without concrete code reference = data corruption in the backlog. Re-read code; ask the human if still ambiguous.

## Block decomposition

Group the scoped issues into 3-5 blocks. Sweet spot: 4 blocks, 4-5 issues each.

Rules:
- **Foundation block first** (sequential): shared ports, schema changes, infrastructure that later blocks depend on. Must succeed before parallel work starts.
- **Parallel blocks** (worktree-isolated): cohesive groups touching disjoint paths. Two parallel blocks max (orchestrator review bandwidth).
- **Sequential cleanup block last**: cross-cutting refactor that needs final state from prior blocks (e.g. test refactor that depends on UI changes settling).
- **Same-stack cohesion**: each block leans on one stack (backend / frontend / cross-stack). Mixing stacks dilutes the agent prompt.
- **Issue size**: agent prompts handle 5-7K chars with 4-5 issues. Smaller blocks → hallucination; larger blocks → context dilution.
- **Conflict surface**: list files each block will touch; if two parallel blocks overlap on a hot file (`Mozgoslav.Api/Program.cs` DI, `python-sidecar/app/main.py` router registration, `frontend/src/store/rootReducer.ts`, `lefthook.yml`), one of them must run sequentially.

Output: a block plan in chat (no .md file in repo — extra files violate the autonomous-run discipline). Format:

```
**Branch:** <username>/<kebab-slug>
**Blocks:**
- B1 (sequential, foundation): <issues> — ~<estimate>
- B2 (parallel): <issues>
- B3 (parallel with B2): <issues>
- B4 (sequential after B3): <issues>
- Final fix-pass + CI dance + push + PR
```

## Per-block agent prompt template

Each block dispatches one `@developer` (or stack-specific) subagent with `run_in_background: true`. Self-contained prompt:

```
You are Block <X> in the autonomous overnight pipeline for <repo> (`<branch>`).
Previous blocks shipped: <list with one-line summary>.
You run <sequential | in worktree #N parallel with Block Z>.

# Working environment
- Worktree path: <absolute path>
- Branch: <branch>
- Verify: `git -C <path> branch --show-current` must print exactly that.

# Hard constraints (orchestrator policy)
- DO NOT commit. DO NOT push. DO NOT merge. Only write/edit files in the working tree.
- DO NOT run full test suites (orchestrator runs in finale; too slow).
- DO run targeted build verification: `dotnet build -maxcpucount:1` from backend/, `cd frontend && npm run typecheck && npm run lint`, `cd python-sidecar && ruff check . && black --check .`.
- For native code (Swift / Win32 / etc.): per the native-platform-code policy decided pre-run.
- New deps: per the new-deps policy decided pre-run.
- If you hit a true blocker — STOP and report. Do not improvise around acceptance gaps.

# Your scope (<N> issues)
gh issue view <N1> --repo <owner>/<repo> --json title,body --jq '"\(.title)\n\n\(.body)"'
<repeat for each>

# Vision/code reconciliation (per issue, if enabled pre-run)
For each issue, BEFORE writing code:
1. Read body. 2. Read relevant vision sections. 3. Read recent ADRs.
4. `git log --oneline -20 -- <paths>` — has work shipped?
5. Tag: PROCEED | RE-SCOPE | CLOSE-AS-SHIPPED (cite SHA+file:line) | SKIP (cite reason).
6. If RE-SCOPE or CLOSE-AS-SHIPPED — write a one-line note in the report. Do not silently change scope.

# Pre-read (in this order)
1. Issue bodies + reconciliation tags.
2. <root>/CLAUDE.md and per-stack CLAUDE.md.
3. <Files for signatures + reference patterns. Be specific: paths.>
4. Already-shipped this night that you'll consume: <port files / DTOs from prior blocks>.
5. Vision sections + ADRs relevant to this block.

# Per-issue execution plan
## Issue <N1> — <short name>
- Reconciliation tag: <…>
- Goal: <1 sentence>
- Files to create / modify: <full paths>
- Suggested signatures: <…>
- Settings keys / env vars: <…>
- Tests required: <unit + integration locations>
- Acceptance mapping: <how each acceptance bullet maps to code>
- ADR file (if applicable): `docs/adr/<naming>.md`

## Issue <N2> — …

# Open uplift items from previous blocks (попутно поправь если в твоём пути)
<file:line, what to change, why. If not in your path: "not your scope, will be addressed in finale".>

# Hard CI gates (per <root>/CLAUDE.md)
<List from the repo's coding contract: comments ban, primary ctor ban, region ban, JSX style ban, theme tokens, etc.>

# TDD style
1. Failing tests for the whole block FIRST.
2. THEN implementation until tests pass and build is green.
3. `dotnet build` from backend/. Frontend: `npm run typecheck && npm run lint`. Python: targeted `pytest tests/<file>` if you can.
4. After all changes, run codegen if you touched `.graphql` operations.

# Out of scope tonight (DO NOT touch)
<Explicit deferral list: other blocks, deferred features, native build, ...>

# Report when done
1. Files created / modified / archived (full paths).
2. Reconciliation tags per issue + one-line evidence.
3. Build / typecheck / lint / codegen exit codes (last 30 lines if failed).
4. New deps added with versions + rationale.
5. Deviations from this plan + reason.
6. Items you couldn't complete + workaround if any.
7. Open uplift items for the orchestrator to handle in finale.
8. Native «verify-required» list (file paths + what to verify).

Begin now. Time budget ~<X>h.
```

## Execution loop

For each block:

1. **T0 prep (orchestrator).** Verify branch; pull; read pending issue bodies fresh; perform reconciliation; compose agent prompt.
2. **Foundation block (sequential)** runs first. Single agent. Wait for completion.
3. **Parallel blocks** via worktrees:
   ```bash
   git worktree add -b <branch>-block-<X> <path> HEAD
   ```
   Dispatch agents with `run_in_background: true`.
4. **When agent reports done:**
   - Read agent's report (do NOT tail JSONL output files — they explode the context).
   - `git -C <path> status -s` and `git -C <path> diff --stat` to see scope.
   - Generate patch:
     ```bash
     git -C <path> diff > /tmp/block-<X>.diff
     (cd <path> && git ls-files --others --exclude-standard | xargs tar czf /tmp/block-<X>-untracked.tgz)
     ```
   - Apply in main worktree:
     ```bash
     git apply --3way /tmp/block-<X>.diff
     tar xzf /tmp/block-<X>-untracked.tgz -C .
     ```
   - Resolve conflicts manually. Frequent conflict points: DI composition root, router registration, store reducer, lefthook config.
   - Verify locally: `dotnet build -maxcpucount:1`, `cd frontend && npm run typecheck && npm run lint`. NO full test runs at this stage.
   - **DO NOT spawn a separate fix-agent for diff issues.** Uplift them as instructions in the NEXT block's prompt.
   - Commit on the main night branch with a conventional message: `git commit -m "<type>(<scope>): <subject>"`.
5. **Sequential dependent blocks** receive uplift from prior blocks: actual signatures, deviations to fix, constraints.
6. **Final consolidated fix-pass** (orchestrator-direct, NO agent). Address every accumulated uplift item by file/line. Resolve any remaining merge artifacts. Schema snapshot regen if backend types added; strip BOM (`sed -i '1s/^\xEF\xBB\xBF//' file.snap`). Frontend codegen if `.graphql` changed.
7. **Single full local CI run**: `bash scripts/agent-gate.sh`.

## CI dance

After push, CI may fail on auto-format gates. Fix iteratively, separate commits with conventional `chore:` / `style:` messages:

| Gate | Fix |
|---|---|
| `dotnet format --verify-no-changes` | `cd backend && dotnet format <Solution>.sln` |
| `npx prettier --check` | `cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" "electron/**/*.ts"` |
| `npm run check-styles` | `cd frontend && npm run check-styles -- --fix` |
| `npm run lint` | `cd frontend && npm run lint -- --fix` |
| `npm run typecheck` | Read `error TSxxxx` from logs; fix imports / signatures; rerun |
| `ruff check .` | `cd python-sidecar && source .venv/bin/activate && ruff check --fix . && ruff format .` |
| `black --check .` | `cd python-sidecar && source .venv/bin/activate && black .` |
| `check-encoding.sh` (BOM) | `sed -i '1s/^\xEF\xBB\xBF//' <file>` |
| Test failures | Read failing test + tested file; fix root cause; targeted `dotnet test --filter "FullyQualifiedName~<Class>"` to verify |

Cap CI-fix cycles at 4. After that, escalate to the human — silent retry-loops mask root causes (this is best practice 2026: agentic CI catches ~15 % of bugs but masks the rest if you let it loop).

**Triage workflow** when red CI:

```bash
RUN=$(gh run list --repo <owner>/<repo> --branch <branch> --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view $RUN --repo <owner>/<repo> --json jobs --jq '.jobs[] | select(.conclusion=="failure") | "\(.name) \(.databaseId)"'
gh run view $RUN --repo <owner>/<repo> --job <jobId> --log-failed | grep -E "##\[error\]|FAIL|error TS|expected" | head -30
```

GitHub auth from sandbox often fails on log-redirect to Azure blob storage (`Could not resolve host: productionresultssa*.blob.core.windows.net`). Fall back to `gh run view --log-failed` which uses the API path, not the blob redirect.

## PR creation

```bash
gh pr create --base main --head <branch> \
  --title "<type>(<scope>): <header ≤100>" \
  --body-file <(cat <<'EOF'
Closes #<N1>
Closes #<N2>
…

ADRs:
- docs/adr/ADR-<…>.md
- docs/adr/ADR-<…>.md

Manual verification required:
- [ ] <macOS smoke test>
- [ ] <native compile if any>
- [ ] <integration smoke if any>
EOF
)
```

PR body discipline:
- `Closes #N` ONLY for issues this PR actually completes.
- Follow-up issues (filed during the run) referenced as `See #N` (no close-keyword) — auto-close on merge would erase them.
- No motivational sections («What/Why/Risk/Test plan») — the issue bodies + ADRs already say it. Keep PR body terse.

## Final review (orchestrator-direct, no agent)

After CI green:

1. **Acceptance check per issue.** Fetch each closed issue's body, walk acceptance bullets against shipped code via `Read` / `Grep`. Mark ✅ / ⚠️ / ❌. Cite file:line.
2. **Vision drift check.** Re-read vision sections relevant to the run; compare to delivered artifacts.
3. **Cross-cutting hygiene.** Coding contract bans (comments / primary ctors / regions / inline JSX style / magic colors), settings keys named consistently, DI registrations, schema snapshot regenerated, GraphQL operations match resolvers, per-stack `CLAUDE.md` updated for new endpoints.
4. **Reconciliation follow-through.** For every `RE-SCOPE` or `CLOSE-AS-SHIPPED` tag — verify the rationale survives the final code state.
5. **Punch list.** Must-fix vs nice-to-have. Must-fix → fix in this PR. Nice-to-have → file follow-up issue (no close-keyword).
6. **Report to human.** PR URL, closed issues list with reconciliation tags, follow-up issues filed, vision drift summary, manual-verification checklist.

## Critical gotchas (sticky lessons)

1. **Agents commit nothing, push nothing, merge nothing.** They write files. Orchestrator commits between blocks.
2. **No inter-block fix-agents.** Errors of block N → uplift in prompt of block N+1. Final consolidated fix-pass at the end.
3. **No `@analyzer` review between blocks.** Orchestrator does diff review by reading. `@analyzer` only on demand for standalone PR review at the end.
4. **No extra files between blocks.** No ADR/report/changelog markdown unless an in-scope issue explicitly requires an ADR. Findings live in chat or issue bodies.
5. **`dotnet test` (or any full test suite) is too slow during agents.** Only `dotnet build`. Targeted `dotnet test --filter` for verification; full suite once before push.
6. **Local CI gates that don't run unless invoked**: `dotnet format --verify-no-changes`, `npx prettier --check`, `npm run check-styles`, `npm run lint`, `ruff check .`, `black --check .`, `bash scripts/check-encoding.sh`, `bash scripts/agent-gate.sh`. Run them ALL before push.
7. **Schema snapshot regeneration writes BOM** (depending on the test framework). `check-encoding.sh` then fails. Strip with `sed -i '1s/^\xEF\xBB\xBF//' <file>`.
8. **Acceptance traps.** An issue's acceptance can assume code paths that don't exist. Agent must flag and report — not silently fail.
9. **Force-push on the feature branch requires explicit human approval.** Never assume. Use `--force-with-lease` when authorized.
10. **`Closes #N` in commit message auto-closes on merge.** Followups referenced WITHOUT close-keywords (`See #N`).
11. **Native code in `native/`** (Swift / Win32 / kernel) — write only, do NOT compile in the sandbox. Document the deferral in PR body. Honor the native-policy decided pre-run.
12. **Agent prompt size** — comprehensive but focused. ~5-7K chars with 4-5 issues. Don't fragment too small (hallucinations) or stuff too wide (context dilution).
13. **Pattern matching ≠ proof.** Before «do as in X», formulate the CRITICAL DIFFERENCE (signature, receiver type, depth, arguments). Apply at agent prompt time and in orchestrator review.
14. **`process.cwd()` in Electron is unreliable** across `npm run dev` (cwd=frontend) vs `electron ./dist/main.js` (cwd=invoker). Anchor to `__dirname` or sentinel-walk for repo-relative artifacts in dev mode.
15. **Capability-aware code paths**: when adding capability-aware behaviour, default PERMISSIVE when probe data is missing. Probes OPT-IN to non-default features, they don't gate base behaviour.
16. **Worktree application order**: when applying parallel patches to main, apply the SMALLER diff first to minimize conflicts in the larger one.
17. **`type/decision` issues** — closing without committing the ADR file violates ADR discipline. Always commit ADR to `docs/adr/<naming>.md` BEFORE closing.
18. **Reconciliation false positives**: `CLOSE-AS-SHIPPED` without concrete code reference (file:line, SHA) is data corruption. Re-read; ask the human if ambiguous.
19. **Triage scope explosion** (e.g. zero-failures fix-all): if surveying reveals far more work than budgeted, STOP and report before fixing all. Cap to a fraction of total time budget (~25%).
20. **Visual progress tracking** via task tools for multi-step work — this is how the human watches the run from afar.
21. **GitHub access via `gh`** — the token belongs to the human; comments / labels / closures appear under their account. No service account; act accordingly.
22. **Hooks in fresh checkout/worktree are EMPTY.** `lefthook.yml` in the repo doesn't auto-activate — `lefthook install` is mandatory. Without it, prettier/eslint/dotnet-format pre-commit auto-fix is dead silent and CI rejects on cosmetic drift. See Bootstrap section.
23. **`agent-gate.sh` after rebase / cherry-pick is suspect.** A green gate before rebase ≠ green after. Re-run `npx prettier --write` and the full gate after every history rewrite. Cherry-pick preserves stale formatting verbatim.
24. **`Closes #N #M` in PR body does NOT close #M.** GitHub's auto-close parser only honors `Closes #N` per occurrence — bare `#M` after the first ID is just a mention. Use one `Closes #X` per line, or close manually post-merge.
25. **`gh run view --log-failed` redirects to Azure blob storage**, which is often unreachable from sandboxes (`Could not resolve host: productionresultssa*.blob.core.windows.net`). Stick to the streaming API path (`gh run view <run> --json jobs` then `--job <id> --log-failed`); avoid raw `curl` to the storage URL.
26. **Issue body of `type/decision` is the spec.** When implementing children of a parent decision issue (#240 → #241–247), the parent's body is the contract — diverging silently is a defect. Quote the parent's "Proposal" section in agent prompts.
27. **CLAUDE.md drift — code wins.** If CLAUDE.md says X (e.g. "`EnsureCreatedAsync`, not a migration tool") but the live code does Y (`DatabaseInitializer` calls `MigrateAsync()`), follow the code and update CLAUDE.md in the same PR. Don't trust stale guardrails.
28. **HotChocolate masks resolver errors in Production.** `IncludeExceptionDetails = false` turns every resolver exception into `"Unexpected Execution Error"`. The schema builder flips it on for non-`Production` environments — keep that distinction or you'll burn iterations debugging blind during integration tests.
29. **EF Core SQLite + `DateTimeOffset` in ORDER BY** is not translatable. The query throws at runtime. Sort client-side via `await q.ToListAsync()`-then-`.OrderBy(...)` for bounded result sets (e.g. concurrency-capped lists).
30. **Redux state drift in feature slices.** When a feature has both a list (`activeDownloadList`) and a per-item progress map (`downloadProgress[id]`), every reducer must update **both**. UI reads one, events update the other = silent staleness. Either keep one source of truth and derive the other in a selector, or write an explicit invariant test.
31. **`connect` mapStateToProps overrides ownProps silently.** A component already wired through a container ignores the `isOpen` / `onClose` props the caller passes — `mapStateToProps` wins. After connecting, either drop the local-state caller or make the props optional.
32. **TS strict + Jest unused imports.** `noUnusedLocals: true` rejects test files that import a helper but later remove the assertion using it. Run `npx tsc --noEmit` before every push — frontend Jest doesn't catch this; CI does.
33. **In-process HTTP fixtures beat WireMock.** `ApiFactory.ModelsHttpResponder` (and friends) — a settable `Func<HttpRequestMessage, ..., Task<HttpResponseMessage>>` overridden via `services.AddHttpClient(name).ConfigurePrimaryHttpMessageHandler(...)` — gives integration tests deterministic timing without spinning a real server.
34. **`Mozgoslav.sln` lives in `backend/`**, not at repo root. `dotnet build Mozgoslav.sln` from root fails with `MSB1009: Project file does not exist`. Use `dotnet build backend/Mozgoslav.sln` or `cd backend &&` everywhere — the `backend/CLAUDE.md` `commands` block now uses repo-root paths so the snippets are copy-pasteable.
35. **Issue test plan must be upfront with stable TC ids.** Method names like `TC_B14b_NewStart_AfterTransientFail_UsesRangeHeader` grep back to the issue body. Without TC ids, agents skip cases silently and the orchestrator can't audit what's missing. Use `backlog.yml`'s `Test plan` section.
36. **State machine fan-out tests must cover every entry edge.** `TC-B14a/b/c/d` (re-mutation after Active / Failed-Transient / Failed-Sha / Cancelled) — each entry condition needs an explicit test, not a single "happy path after failure".

## Stacked PR pattern (rebase recipe)

When you split work into PR1 (`shuka/<branchA>`) → PR2 (`shuka/<branchB>` stacked off PR1):

1. After PR1 merges into `main`:
   ```bash
   git fetch origin
   git checkout main && git pull --ff-only origin main
   ```
2. Rebase PR2 on fresh `main` — but `git rebase origin/main` from PR2 branch may fail with `CONFLICT (content)` on commits that were squashed-merged (their content survives in `main` but their SHAs don't match).
3. Cleaner alternative: **fresh branch + cherry-pick** only the PR2-specific commits:
   ```bash
   git checkout -b <branch>-v2 origin/main
   git cherry-pick <sha1> <sha2> ...        # only PR2 commits, skip the PR1 ones
   git push -f origin HEAD:<original-branch-ref>   # GitHub updates the same PR
   ```
4. **CRITICAL: re-run `npx prettier --write` on the rebased branch BEFORE force-push.** Cherry-pick preserves commit content one-for-one, including stale formatting from earlier in the day, and the local `agent-gate.sh` you ran on the old branch state is no longer authoritative.
5. Re-run `bash scripts/agent-gate.sh` on the cherry-picked branch. Force-push only when green.
6. `--force-with-lease` is safer than `-f` — refuses if upstream advanced (someone else pushed).

## When the autonomous run is wrong

Skip the autonomous pattern when:
- Scope is 1-3 issues. Single-session is faster + safer.
- Any issue requires irreversible operations (DB drops, external system writes, force-push to upstream).
- The codebase is under active human flux on the same paths — merge conflict surface is unmanageable.
- New language / framework introduction — research-heavy, agent prompts can't compress the unknowns.
- Security-critical changes (auth, crypto, secrets) — human review must happen mid-flight, not post-hoc.

In those cases: stack of single-sessions, or wait for human availability.
