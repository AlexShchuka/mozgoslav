# Contributing to Mozgoslav

Rules and conventions live in `CLAUDE.md`. This file is just setup.

## Requirements

| Component | Version |
|-----------|---------|
| macOS | 14+ (Apple Silicon) for DMG builds and CoreML. Linux is fine for backend / sidecar dev. |
| .NET SDK | 10.0+ |
| Node.js | 24+ |
| Python | 3.11+ |
| ffmpeg | any |

## Run

```bash
./scripts/demo.command
```

Starts backend + python sidecar + Electron UI. First run bootstraps everything; subsequent runs only reinstall when lockfiles change. Ctrl+C in the terminal kills the whole stack.

## Before you commit

Run the same gates CI runs. Pushing without these is a regression risk — CI is not a linter of last resort.

**Always auto-format first**, then verify. CI runs `--verify-no-changes` / `--check` and fails without diff context — fix it locally:

```bash
dotnet format backend/Mozgoslav.sln --verbosity minimal
cd frontend && npx prettier --write "src/**/*.{ts,tsx,css}" "electron/**/*.ts" && cd ..
```

Then run the gates:

```bash
scripts/check-encoding.sh
uncomment --dry-run --remove-todo --remove-fixme --remove-doc backend frontend/src frontend/electron python-sidecar native scripts

dotnet format backend/Mozgoslav.sln --verify-no-changes --verbosity minimal
dotnet build  backend/Mozgoslav.sln -maxcpucount:1 -warnaserror
dotnet test   backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj             -maxcpucount:1 --no-build --settings backend/UnitTests.runsettings
dotnet test   backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj -maxcpucount:1 --no-build --settings backend/IntegrationTests.runsettings

cd frontend && npm run typecheck && npm run lint && npm run check-styles && npm run check-translations && npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts" && npm test -- --watchAll=false
cd python-sidecar && ruff check . && black --check . && pytest -q
cd native/MozgoslavDictationHelper && swift build -c release && swift test
```

Unused `using` directives are enforced via `dotnet build -warnaserror` (analyzer IDE0005). Codestyle is enforced via `dotnet format`. Comments, TODO, FIXME and docstrings are banned — `uncomment` above catches drift.
