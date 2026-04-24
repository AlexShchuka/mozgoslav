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

Auto-format first, then verify. CI runs `--verify-no-changes` / `--check` and fails without diff context.

```bash
dotnet format backend/Mozgoslav.sln --verbosity minimal
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" "electron/**/*.ts" && cd ..
```

Then:

```bash
scripts/check-encoding.sh
uncomment --dry-run --remove-todo --remove-fixme --remove-doc \
  backend frontend/src frontend/electron python-sidecar native scripts

dotnet format backend/Mozgoslav.sln --verify-no-changes --verbosity minimal
dotnet build  backend/Mozgoslav.sln -maxcpucount:1 -warnaserror
dotnet test   backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj \
  --settings backend/UnitTests.runsettings -maxcpucount:1
dotnet test   backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj \
  --settings backend/IntegrationTests.runsettings -maxcpucount:1

cd frontend && npm run typecheck && npm run lint && npm run check-styles \
  && npm run check-translations \
  && npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts" \
  && npm test -- --watchAll=false
cd python-sidecar && ruff check . && black --check . && pytest -q
cd native/MozgoslavDictationHelper && swift build -c release && swift test
```

## PR workflow

- Branch `<username>/<kebab-slug>` off `main`; one logical change per branch.
- Squash-merge only. PR title becomes the commit message.
- PR title is linted against `@commitlint/config-conventional` (`validate / commitlint` in CI). Header ≤ 100 chars. Types: `feat fix docs style refactor perf test build ci chore`. Breaking: `feat(scope)!: …`.
- PR body: bullets — what / why / risk / test plan. No motivation essays.

## Issues

Open new Issues via `.github/ISSUE_TEMPLATE/{backlog,bug,decision}.yml`. Labels `feature/<name>` + `type/{backlog|bug|decision}` are applied from the form; do not open blank Issues.

## Push (humans only)

The repo's `pre-push` lefthook refuses pushes unless `MOZGOSLAV_HUMAN_PUSH=1` is set. Push from a terminal a human is watching:

```bash
MOZGOSLAV_HUMAN_PUSH=1 git push -u origin <branch>
```

AI agents never push. They open local branches and hand over to a human for the push step.

## Release

Tagging `v*.*.*` triggers `.github/workflows/release.yml` — builds a self-contained macOS arm64 `.dmg` (bundled backend, models, syncthing, dictation helper) and attaches it to the GitHub Release. Signing + notarization are off until `MAC_CERT_P12_BASE64` / `APPLE_API_KEY_BASE64` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER_ID` / `MAC_CERT_PASSWORD` / `KEYCHAIN_PASSWORD` land in GitHub Secrets; users see a Gatekeeper warning on first launch of unsigned builds.
