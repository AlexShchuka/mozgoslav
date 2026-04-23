# Contributing to Mozgoslav

Operational rules and project conventions live in `CLAUDE.md`. This file covers setup and workflow only.

## Requirements

| Component | Version |
|-----------|---------|
| macOS | 14+ (Apple Silicon) for DMG builds and CoreML. Linux is fine for backend / sidecar dev. |
| .NET SDK | 10.0+ |
| Node.js | 24+ (minimum 20) |
| Python | 3.11+ (3.12 recommended) |
| ffmpeg | any |

## Quick start

```bash
# backend
cd backend && dotnet run --project src/Mozgoslav.Api -maxcpucount:1

# frontend
cd frontend && npm install && npm run dev

# python sidecar (optional)
cd python-sidecar
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
```

DMG (macOS only): `cd frontend && npm run dist:mac`.

## Tests

```bash
cd backend && dotnet test Mozgoslav.sln -maxcpucount:1
cd python-sidecar && source .venv/bin/activate && pytest
cd frontend && npm test -- --watchAll=false
```

## Lefthook (pre-commit)

Install once:

```bash
brew install lefthook
cd mozgoslav && lefthook install
```

Pre-commit runs `dotnet format`, `eslint --fix`, `prettier --write`, `ruff --fix + black` on staged files, plus `gitleaks` if present.

## Adding a frontend feature

All new features and slices go through the plop generator:

```bash
cd frontend && npm run plop
```

Two generators:

- `feature` — scaffolds `src/features/<Name>/` for the Container + Presentational pattern.
- `slice` — scaffolds `src/store/slices/<name>/` for the canonical Redux + Saga shape.

After generation: register the reducer in `rootReducer`, the watcher in `rootSaga`, and re-export the feature from its folder index.

Read-only pages (Logs, Notes viewer, DictationOverlay) stay hook-based — the `feature` generator is not used for them.
