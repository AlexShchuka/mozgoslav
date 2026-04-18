# v0.8 «Доведение до ума» — overview and execution order

- **Owner:** shuka + one developer agent.
- **Branch:** `shuka/v0.8-production-ready` (branched from `origin/main` at `f561fc1`).
- **Target MR:** one MR against `main`. Checkpoint commits per block. No force-push.
- **ADR basis:** ADR-009 (no stubs) + ADR-010 (bundled RU models). All plan files below operate under those decisions.

---

## 1. What v0.8 is

A production-readiness pass over the existing skeleton so a macOS user can install the DMG, go through a short Onboarding, import an audio recording, get a structured Markdown note in Obsidian, and — if they want — dictate with a global hotkey. Every feature that lands either works end-to-end or is honestly gated. No stubs. No fake returns. No silent no-ops.

## 2. What v0.8 is NOT

- New features (ADR-008 web-RAG, ADR-006 calendar autostart, new LLM providers, batch folders, dark-mode polish).
- Apple Developer signing of the DMG (deferred — see `07-dmg-and-release.md`).
- GigaAM-v3 RU STT (requires separate NeMo inference stack — Phase 2).
- Feature-flag controlled parts that are actually still stubs (that would violate ADR-009 §2).
- Version bump in `package.json` / backend project files. Version stays at `0.1.0` until v0.8 is merged; the user decides the bump at merge time.

## 3. Block order and dependencies

The single MR is assembled as a sequence of checkpoint commits; each checkpoint is shuka-reviewable on its own. Order is load-bearing — downstream blocks depend on upstream.

| # | Block | File | Depends on | Mac-validation needed? |
|---|---|---|---|---|
| 1 | CI green | `01-fix-ci-failures.md` | — | No (all CI runs on hosted runners) |
| 2 | ML sidecar production | `02-ml-sidecar-production.md` | 1 (green CI as baseline) + ADR-010 | Partial — verify model download on Mac |
| 3 | Mac native recorder | `03-mac-native-recorder.md` | 1 | **Yes** — shuka runs on Mac, reports back |
| 4 | Onboarding slim | `04-onboarding-slim.md` | 2, 3 (endpoints + recorder shape) | **Yes** — final UX on Mac |
| 5 | Glossary + LLM correction | `05-glossary-and-llm-correction.md` | 1 | No |
| 6 | Obsidian REST API | `06-obsidian-rest-api.md` | 1 | Partial — needs a running Obsidian with REST plugin on Mac for end-to-end check |
| 7 | DMG + release | `07-dmg-and-release.md` | 2, 3, 4, 5, 6 (everything the DMG ships) + ADR-010 | **Yes** — shuka runs `dist:mac`, launches DMG, first-run |
| 8 | Cleanup + archive | `08-cleanup-and-archive.md` | All above | No |

**Critical path:** 1 → 2 → 3 → 4 → 7 → 8. Blocks 5 and 6 run in parallel (no file overlap with 2/3/4) but join before 7 (DMG must ship them).

## 4. Checkpoint cadence

After each block the agent pauses and produces:

1. **Block summary** — what changed, which files touched, test status, open questions.
2. **Mac validation checklist** (when applicable) — the exact steps shuka runs on Mac to sanity-check the block before moving on.
3. **Updated `plan/v0.8/STATUS.md`** — a running log of completed blocks and their validation state.

shuka then either:
- Acknowledges and the agent proceeds to the next block.
- Reports a problem from Mac validation — agent fixes in the same block before moving on.

No block is marked "done" until shuka has either validated it on Mac (for Mac-validation blocks) or reviewed the diff (for sandbox-only blocks).

## 5. Handoff contract between agent and shuka

- **Agent runs:** all Linux-sandbox-possible builds (`dotnet build`, `dotnet test`, `npm ci`, `npm run typecheck`, `npm run build`, `pytest`, `ruff`, Docker/Testcontainers).
- **Agent does NOT run:** `swift build` for `MozgoslavDictationHelper`, `npm run dist:mac` (electron-builder `--mac`), anything that touches AVFoundation / AVAudioEngine / AppKit / ApplicationServices, real Obsidian, real Syncthing pairing with phone. These are shuka's to run on Mac.
- **For Mac-validation blocks**, the agent writes a checklist in the block's file. Every item has: what to do (command or action), expected observation, what to report back if it diverges.
- **shuka reports:** `blockN-mac-validation-YYYY-MM-DD.md` in the workspace (not committed) with per-item pass/fail + output. Agent reads this and either proceeds or fixes.

## 6. Branch and commit strategy

```
main (origin)
 └── shuka/v0.8-production-ready
      ├── [block 1] CI green — 2 test fixes + package-lock + cache
      ├── [block 2] ML sidecar production — real diarize/ner + gender/emotion gated
      ├── [block 3] Mac native recorder — AVAudioEngine helper + backend contract
      ├── [block 4] Onboarding slim — 3 required + autodetect + platform-aware
      ├── [block 5] Glossary + LLM correction — real impl + per-profile settings
      ├── [block 6] Obsidian REST API — client + fallback to file I/O
      ├── [block 7] DMG + release — icon + fetch-bundle-models.sh + workflow
      └── [block 8] Cleanup + archive — reports to .archive/, old ADRs archived
```

Each bracketed line is one or more commits. Commits within a block use conventional-style prefixes (`fix(ci)`, `feat(ml)`, `chore(cleanup)`) as already in use in the repo.

Push to origin only when shuka explicitly green-lights the branch. No auto-push.

## 7. Exit criteria for v0.8

v0.8 is done when **all** hold:

1. CI on `shuka/v0.8-production-ready` is green for all four jobs (backend, frontend, python, dictation-helper).
2. Every item in ADR-009 §2.1 is resolved per the table (implemented, honestly gated, or behind a disabled feature flag with user-facing UI signalling).
3. Bundle models are fetched by `dist:mac`, DMG builds successfully on macos-latest runner, produced artefact runs on shuka's Mac and completes the "import audio → transcribe → export to Obsidian" happy path.
4. Onboarding walks a fresh user (first-run on a clean `~/Library/Application Support/Mozgoslav/`) through the required steps in under 2 minutes on shuka's Mac.
5. All TODO/FIXME markers in code paths that execute in production are either resolved or converted to GitHub issues.
6. `.archive/reports/` holds every `*-REPORT.md` and `developer-*.md` from the repo root; `docs/adr/.archive-v2/` holds every ADR superseded or implemented by this iteration.
7. `SELF-REVIEW.md` is rewritten against v0.8 state.
8. shuka signs off on the MR after reading the final diff summary.

Version bump in `package.json` / backend files is **deferred until merge**. shuka chooses the number at that time.

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `whisper-small` RU quality unacceptable on shuka's test audio | Medium | Block 4/7 rework | Fallback to `ggml-base` with loud "upgrade" CTA (ADR-010 §3.5) |
| AVFoundation helper fails on shuka's macOS version | Medium | Block 3 stuck | Swift package is stable back to macOS 12; fallback: treat recorder as platform-gated, flag dictation off |
| Obsidian REST plugin not installed on shuka's Mac | Low | Block 6 validation delayed | File-I/O path is primary; REST is opportunistic. Validation ok-to-skip with explicit note |
| GH Releases CDN download adds minutes to `dist:mac` first run | Low | Dev-UX slowdown | Script caches into `frontend/build/bundle-models/`, idempotent |
| CI job that is currently green breaks during refactor | Medium | Block 1 regresses | Per-block `dotnet test`, `npm test`, `pytest` before commit; CI-as-review |
| The single MR grows beyond review capacity | High | shuka can't review | Per-block commits are independently readable; STATUS.md is the anchor |

## 9. Source-of-truth cross-reference

- `docs/adr/ADR-009-production-readiness-no-stubs.md` — policy.
- `docs/adr/ADR-010-bundled-russian-models.md` — model distribution.
- `docs/adr/ADR-007*.md` — onboarding basis (§D15 step order) — block 4 keeps compatibility where honest, changes where ADR-009 demands.
- `docs/adr/ADR-002*.md`, `ADR-003*.md` — superseded by implementation; move to archive in block 8.
- `SELF-REVIEW.md` — current-state audit; rewritten in block 8.
- `README.md` — user-facing; updated in block 8 to reflect bundled models.
