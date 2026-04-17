# Block 8 — Cleanup, docs refresh, ADR archive

- **Block owner:** developer agent.
- **Mac validation required:** no.
- **Depends on:** all previous blocks (1-7). Runs last.
- **Unblocks:** merging the v0.8 MR.

---

## 1. Context

The repo root and `docs/adr/` currently hold a large amount of agent-produced reports and older ADRs that described earlier iterations. Per shuka: "старые ADR в архив, всё что мы реализовали — не нужно в корне". This block sweeps the repo clean while preserving history.

**Explicit non-goal for v0.8:** bumping `package.json` / backend project file versions. shuka sets the final version at merge time.

## 2. Files to move / delete

### 2.1 Root-level reports → `.archive/reports/`

The repo root (per `git ls-tree -r --name-only origin/main`) currently holds:

```
agent-a-report.md
developer-4fb2c1.md
developer-a7f3b9.md
developer-b4k8p2.md
developer-d8a2e1.md
DICTATION-REPORT.md
FEATURE-DEV-REPORT.md
POLISH-REPORT.md
phase1-agent-a-report.md
phase2-backend-cleanup-report.md
phase2-backend-report.md
phase2-frontend-report.md
phase2-python-report.md
phase2-swift-report.md
todo-backend-report.md
todo-frontend-report.md
```

Action: `git mv <each> .archive/reports/` and commit as `chore(archive): move agent-generated reports out of repo root`.

Also move any per-block reports left over from the v0.8 development pass (e.g. `block3-mac-validation-*.md`) into `.archive/reports/v0.8/`.

### 2.2 Old ADRs → `docs/adr/.archive-v2/`

ADRs that have been implemented by v0.8 (all features from ADR-001..ADR-007 are now in production code; ADR-008 is groom-only, stays). shuka's directive: "старые ADR... в архив".

Move list (confirm by reading the current `docs/adr/` directory listing; `.archive-v1/` already exists for pre-iteration-7 ADRs):

- `ADR-007.md` → `.archive-v2/ADR-007-iteration-7-scope.md`
- `ADR-007-phase1-agent-A.md` → `.archive-v2/`
- `ADR-007-phase2-backend.md` → `.archive-v2/`
- `ADR-007-phase2-frontend.md` → `.archive-v2/`
- `ADR-007-phase2-python.md` → `.archive-v2/`
- `ADR-007-phase2-swift.md` → `.archive-v2/`
- `ADR-007-shared.md` → `.archive-v2/`

Keep in `docs/adr/`:
- `ADR-008-web-rag.md` — groom, not yet implemented.
- `ADR-009-production-readiness-no-stubs.md` — active policy for v0.8+.
- `ADR-010-bundled-russian-models.md` — active policy for v0.8+.
- `README.md` — updated (see §2.4).

### 2.3 Duplicate electron-builder config

Already addressed in Block 7: remove the `build` key from `frontend/package.json`. Confirm clean in this block.

### 2.4 `docs/adr/README.md` rewrite

Current README references ADR-007 only. Rewrite to:

```markdown
# Architecture Decision Records

Active decisions (v0.8+):

| # | Document | Status |
|---|----------|--------|
| 008 | [ADR-008 — Web-aware RAG](ADR-008-web-rag.md) | Groomed, not accepted |
| 009 | [ADR-009 — Production readiness, no stubs](ADR-009-production-readiness-no-stubs.md) | Accepted |
| 010 | [ADR-010 — Bundled Russian models](ADR-010-bundled-russian-models.md) | Accepted |

Archived (historical reference only — superseded by current code):

- `.archive-v1/` — pre-iteration-7 ADRs (ADR-001..006).
- `.archive-v2/ADR-007-*.md` — iteration 7 (onboarding, models, RAG, syncthing). All shipped.
```

### 2.5 `TODO.md` rewrite

Current `TODO.md` lists items closed in iteration 7 plus a V2 roadmap. After v0.8 merge, most items shift state:

- ✅ **Closed** — move to a one-line "Shipped in v0.8:" section at the top.
- 🚫 **Won't** — out of v0.8 scope, flagged per ADR-009 §2.2.
- 🔜 **Phase 2** — signing, GigaAM-v3, calendar autostart, web-RAG — listed explicitly.

Actual rewrite done after all other blocks commit, so TODO reflects reality.

### 2.6 `SELF-REVIEW.md` rewrite

Current document is dated 2026-04-16 and reviews the pre-v0.8 state. Rewrite at the very end of v0.8 with the same structure:

1. Compliance with ADR-001 — marked per-row.
2. Compliance with ADR-009 (new) — audit of every §2.1 row.
3. Compliance with ADR-010 (new) — bundle present, Tier 2 catalogue entries wired.
4. Deliberately deferred items (Phase 2).
5. Conclusion.

### 2.7 Inline TODO/FIXME cleanup

Agent greps the codebase for `TODO`, `FIXME`, `HACK`, `XXX`:

```
git grep -n "TODO\|FIXME\|HACK\|XXX" -- backend/src frontend/src frontend/electron python-sidecar/app helpers
```

For each hit:
- If the item is closed by v0.8 implementation → delete the comment.
- If the item becomes a Phase 2 task → open a GitHub issue, replace the comment with `// See #<issue>`.
- If the comment is a genuine code-behaviour note (not a TODO) → leave it. (Rare.)

No inline TODO/FIXME should remain without an issue reference after this block.

### 2.8 `README.md` refresh

Update sections:

- **"Быстрый старт"** → simplify to "Install the DMG, follow Onboarding, you are done." Remove the `cd frontend && npm install && npm run dev` paragraph from the user-facing README — move it to a new `CONTRIBUTING.md` for developers.
- **"Модели"** → add the Tier 1 bundled table + Tier 2 downloadable table (ADR-010 §2.2/§2.3).
- **"Из терминала"** → keep as a developer footnote or move to CONTRIBUTING.
- **"Быстрый старт в Rider"** → move to CONTRIBUTING.
- **"Ограничения"** → update: native mic recorder is shipped, dictation hotkey is shipped-or-feature-flagged, V3 ML is shipped for diarize+NER with gender/emotion downloadable.

### 2.9 `CLAUDE.md` (root) refresh

- Update "Per-folder guides" section to reference ADR-009/010.
- Remove "Out of scope (today)" entries that are now shipped (Noop recorder, ML stubs).

## 3. Tasks

1. `mkdir -p .archive/reports && git mv <16 root reports> .archive/reports/`.
2. `mkdir -p docs/adr/.archive-v2 && git mv <7 ADR-007* files> docs/adr/.archive-v2/`.
3. Rewrite `docs/adr/README.md`.
4. Confirm `frontend/package.json` no longer has a `build` key (from Block 7).
5. Grep-and-sweep inline TODO/FIXME; open GitHub issues where necessary.
6. Rewrite `TODO.md`.
7. Rewrite `SELF-REVIEW.md`.
8. Create `CONTRIBUTING.md` with the developer setup (moved from README).
9. Refresh `README.md` for end-user focus.
10. Refresh root `CLAUDE.md`.
11. Commit: `chore(cleanup): archive reports and superseded ADRs, refresh docs`.

## 4. Acceptance criteria

- Repo root has no `*-REPORT.md`, no `developer-*.md`, no `phase*-report.md`, no `todo-*-report.md`.
- `docs/adr/` contains only active ADRs + `.archive-v1/` + `.archive-v2/` + `README.md`.
- `git grep -n "TODO\|FIXME\|HACK"` on `backend/src`, `frontend/src`, `frontend/electron`, `python-sidecar/app`, `helpers` returns either an empty set or only `See #<issue>` pointers.
- `README.md` matches what a first-time user needs; developer docs live in `CONTRIBUTING.md`.
- `SELF-REVIEW.md` is dated the v0.8 merge week and audits against ADR-009/010.

## 5. Non-goals

- Version bump in `package.json` or backend project files — **explicitly deferred** per shuka's directive on 2026-04-17. shuka sets the version at merge time.
- Renaming branches, forcing pushes, rewriting history.
- Removing `TODO-X` markers in code that are cross-referenced with shipped ADR sections (e.g. `TODO-3 / BC-036`) — those serve as traceability back to ADR decisions and stay as documentation.

## 6. Open questions (agent flags if hit)

- Some inline `TODO` comments in `Program.cs` are actually done (e.g. `// TODO-3 / BC-036 — multi-provider LLM. Register each provider once…` — this is not a TODO anymore, it is a doc comment). Treatment: rewrite as regular XML doc or a terse note; delete the `TODO` prefix. Agent applies judgment per-comment.
- `DICTATION-REPORT.md`, `FEATURE-DEV-REPORT.md`, `POLISH-REPORT.md` contain genuinely useful decision history. Treatment: archived (per §2.1), not deleted. Future devs can read them as context.

## 7. Final check before signalling v0.8 done

- All 7 preceding blocks marked complete in the STATUS tracker.
- CI green on the v0.8 branch.
- shuka's Mac validation reports (blocks 3, 4, 6, 7) all `[✓]` or have agreed exceptions.
- Diff against `main` is one cohesive MR; commits are per-block and readable.

---

## 8. Checkpoint summary (Resume Agent, 2026-04-17)

- Root cleanup: 16 reports moved via `git mv` from repo root to `.archive/reports/` — `agent-a-report.md`, `developer-{4fb2c1,a7f3b9,b4k8p2,d8a2e1}.md`, `DICTATION-REPORT.md`, `FEATURE-DEV-REPORT.md`, `POLISH-REPORT.md`, `phase1-agent-a-report.md`, `phase2-{backend,backend-cleanup,frontend,python,swift}-report.md`, `todo-{backend,frontend}-report.md`. Repo root now holds: `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `TODO.md`, `SELF-REVIEW.md`, `LICENSE`, `lefthook.yml`, `.editorconfig`, `.gitignore` plus directories.
- ADR archive: 7 ADR-007 family files moved via `git mv` to `docs/adr/.archive-v2/`. `ADR-007.md` renamed to `ADR-007-iteration-7-scope.md` per plan §2.2. `docs/adr/` now: `ADR-008-web-rag.md`, `ADR-009-production-readiness-no-stubs.md`, `ADR-010-bundled-russian-models.md`, `README.md`, `.archive-v1/`, `.archive-v2/`.
- `docs/adr/README.md` rewritten — active 008/009/010 + archive references.
- `TODO.md` rewritten — Shipped in v0.8 + Phase 2 deferred sections; version bump explicitly deferred per shuka.
- `SELF-REVIEW.md` recreated against ADR-009/010 compliance with per-§ row matrix.
- `CONTRIBUTING.md` created — Rider/CLI/dev setup moved out of `README.md`.
- `README.md` refreshed — install / Onboarding / bundled models (Tier 1) / downloadable (Tier 2) / link to CONTRIBUTING.
- `CLAUDE.md` (root) refreshed — references ADR-008/009/010, removed «Out of scope (today)» entries that shipped (Noop recorder, ML stubs).
- Inline TODO/FIXME/HACK sweep: 18 doc-comment markers in `backend/src` + 7 in `frontend/src` + 3 in `frontend/electron` rewritten without `TODO-N — ` prefix while preserving `BC-NNN` traceability per §5/§6 resolution. Final `git grep -n "TODO\|FIXME\|HACK"` on `backend/src frontend/src frontend/electron python-sidecar/app helpers` returns empty set.
- Version bump in `package.json` / `*.csproj` NOT performed — explicitly deferred per §1/§5 directive.
- Deviations: none material; per §5 in-code TODO-X markers tied to shipped ADR sections were rewritten as plain notes (per §6) rather than left or replaced by `// See #issue` (no GitHub issues created — items are doc, not actionable).
