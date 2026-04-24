# Contributing to Mozgoslav

Human onboarding and the workflow contract. Operating rules for autonomous agents live in `CLAUDE.md` / `AGENTS.md`. If you are an AI agent, start there.

## Requirements

| Component | Version |
|-----------|---------|
| macOS | 14+ (Apple Silicon) for `.dmg` builds and CoreML. Linux is fine for backend / sidecar dev. |
| .NET SDK | 10.0+ |
| Node.js | 24+ |
| Python | 3.11+ |
| Swift | 6.0+ (ships with Xcode 16) |
| ffmpeg | any |
| lefthook | `brew install lefthook` |
| gitleaks | `brew install gitleaks` (optional — lefthook skips if absent) |

## One-shot setup

```bash
lefthook install
./scripts/demo.command
```

`demo.command` boots backend + python sidecar + Electron UI. First run bootstraps everything; subsequent runs only reinstall when lockfiles change. Ctrl+C kills the whole stack.

## Before you commit

Run the same gates CI runs — pushing without these is a regression risk.

**Auto-format first**, then verify. CI runs `--verify-no-changes` / `--check` and fails without diff context:

```bash
dotnet format backend/Mozgoslav.sln --verbosity minimal
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" "electron/**/*.ts" && cd ..
```

Then the gates (the same ones CI runs):

```bash
scripts/check-encoding.sh
uncomment --dry-run --remove-todo --remove-fixme --remove-doc backend frontend/src frontend/electron python-sidecar native scripts

dotnet format backend/Mozgoslav.sln --verify-no-changes --verbosity minimal
dotnet build  backend/Mozgoslav.sln -maxcpucount:1 -warnaserror
dotnet test   backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj             --settings backend/UnitTests.runsettings -maxcpucount:1
dotnet test   backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj --settings backend/IntegrationTests.runsettings -maxcpucount:1

cd frontend && npm run typecheck && npm run lint && npm run check-styles && npm run check-translations \
  && npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts" && npm test -- --watchAll=false
cd python-sidecar && ruff check . && black --check . && pytest -q
cd native/MozgoslavDictationHelper && swift build -c release && swift test
```

Unused `using` directives are enforced by `dotnet build -warnaserror` (IDE0005). Codestyle is enforced by `dotnet format`. Comments, TODO, FIXME, and docstrings are banned — `uncomment` above catches drift.

## PR workflow

- **Branching**: `<username>/<kebab-slug>` off `main`. One logical change per branch.
- **Squash-merge only**; the PR title becomes the commit message.
- **PR title must pass Conventional Commits** (`amannn/action-semantic-pull-request`).
  - Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
  - Header ≤ 100 characters. Scope optional but preferred: `feat(settings): …`.
  - Breaking changes: `feat(scope)!: …`.
- **PR body**: what changed, why, risk, test plan. No motivation essays — bullets.
- **CI must be green** before review. `backlog-guard` will reject PRs that add `**/backlog/*.md` or `**/bugs/*.md`.

## Issue workflow

Backlog / bugs / shipped decisions live as GitHub Issues. Open via the YAML forms under `.github/ISSUE_TEMPLATE/`:

- **Backlog item** — deferred work. Template fills `type/backlog` + feature scope.
- **Bug** — concrete defect. Template fills `type/bug`.
- **Shipped decision** — robot-style record of an architectural change (concept-level, no file paths). Template fills `type/decision`.

New Issues should not be ad-hoc — use the forms so the label contract stays consistent with CI guards and agent tooling.

## Push protocol (human-only)

The repo's `pre-push` lefthook refuses pushes unless `MOZGOSLAV_HUMAN_PUSH=1` is set. This is defence-in-depth against AI agents pushing unreviewed work. Push from a terminal where a human is watching:

```bash
MOZGOSLAV_HUMAN_PUSH=1 git push -u origin <branch>
```

AI agents must never push; they open local branches and hand over to a human for the `git push` step.

## Release

Tagging `v*.*.*` triggers `.github/workflows/release.yml` — builds a self-contained macOS arm64 `.dmg` (bundled backend, models, syncthing, dictation helper) and attaches it to the GitHub Release. Code-signing and notarization are off until Apple Developer ID secrets land (`MAC_CERT_P12_BASE64` et al.); users see a Gatekeeper warning on first launch of unsigned builds.
