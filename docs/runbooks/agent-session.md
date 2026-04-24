# Runbook — AI coding agent session against this repo

End-to-end flow for a session where an AI agent (Claude Code, Codex, Cursor, …) does implementation work. Humans run this; agents follow the rules in `AGENTS.md`.

## Pre-session

- Confirm the task: one logical change per session. Split ambiguous asks into separate sessions.
- Decide branch name: `<username>/<kebab-slug>` off `main`.
- Confirm you have the `MOZGOSLAV_HUMAN_PUSH=1` protocol ready; the agent cannot push.

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

# Human-only push:
MOZGOSLAV_HUMAN_PUSH=1 git push -u origin <username>/<slug>

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
- If the change retires a markdown artefact → `git mv` it into `.archive/` in the same PR; never delete.

## Session failure modes

- Agent starts pushing or hits push resistance → `pre-push` hook refuses unless `MOZGOSLAV_HUMAN_PUSH=1`. Expected. Humans push.
- Agent emits a chain of build→fix→build→fix → stop the chain. One build per iteration, not one per file.
- Agent suggests bumping a package to fix a vulnerability warning → reject. Renovate owns dependency updates; open a `type/backlog` Issue if the warning is load-bearing.
- Agent cannot reach a rule's intent → follow the letter of the rule, surface the tension in the PR description, do not silently override.

## Reproducing this session's flow

This repo's first full agent-driven PR bundled tooling migration + DMG bundling + UI backlog sweep + agent manual rewrite. The same pattern is repeatable:

1. Plan: 1 PR = 1 focused change. Oversize asks get split before implementation, not during.
2. Pre-work: `ls .github/ISSUE_TEMPLATE/` + re-read `AGENTS.md`. Note Boundaries / Do-not / Never.
3. Work: edit → `bash scripts/agent-gate.sh <stack>` → commit. No intermediate full builds.
4. Verify: one full `bash scripts/agent-gate.sh` before push.
5. Hand-off to human: agent prints the branch name + PR body draft; human runs `MOZGOSLAV_HUMAN_PUSH=1 git push` and `gh pr create`.
