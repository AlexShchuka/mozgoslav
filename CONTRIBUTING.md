# Contributing to Mozgoslav

Human onboarding. Agent operating rules live in `AGENTS.md` (canonical) / `CLAUDE.md` (symlink).

## Requirements

| Component | Version |
|---|---|
| macOS | 14+ (Apple Silicon) for `.dmg` builds and CoreML. Linux fine for backend / sidecar dev. |
| .NET SDK | 10.0+ |
| Node.js | 24+ |
| Python | 3.11+ |
| Swift | 6.0+ (ships with Xcode 16) |
| ffmpeg | any |
| lefthook | `brew install lefthook && lefthook install` |
| gitleaks | `brew install gitleaks` (optional — lefthook skips if absent) |

## Run

```bash
./scripts/demo.command
```

Boots backend + python sidecar + Electron UI. First run bootstraps everything; subsequent runs only reinstall when lockfiles change. Ctrl+C kills the whole stack.

## Local gate (matches CI)

```bash
bash scripts/agent-gate.sh               # all stacks
bash scripts/agent-gate.sh backend       # scoped: verify|backend|frontend|python|native
```

The script auto-formats first, then runs the same verify / build / test / lint steps CI runs. Native stage is auto-skipped on Linux.

## PR workflow

- Branch `<username>/<kebab-slug>` off `main`; one logical change per branch.
- Squash-merge only. PR title becomes the commit message.
- PR title follows `@commitlint/config-conventional` (locally enforced by the `commit-msg` lefthook). Header ≤ 100 chars. Types: `feat fix docs style refactor perf test build ci chore`. Breaking: `feat(scope)!: …`.
- PR body: bullets — what / why / risk / test plan. No motivation essays.

## Issues

Open new Issues via `.github/ISSUE_TEMPLATE/{backlog,bug,decision}.yml`. Labels `feature/<name>` + `type/{backlog|bug|decision}` are applied from the form; do not open blank Issues.

## Release

Tagging `v*.*.*` triggers `.github/workflows/release.yml` — builds a self-contained macOS arm64 `.dmg` (bundled backend, models, syncthing, dictation helper) and attaches it to the GitHub Release. Full trigger + unlock-signing checklist: `docs/runbooks/release-dmg.md`.
