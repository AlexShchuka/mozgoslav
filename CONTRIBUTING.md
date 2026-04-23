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
