# Mozgoslav

> Local second brain. Audio → transcript → correction → summary → structured markdown → Obsidian.  
> macOS Apple Silicon desktop app. Privacy-first: nothing leaves the machine except requests to the LLM endpoint you configured yourself.

<p>
  <a href="https://github.com/AlexShchuka/mozgoslav/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/AlexShchuka/mozgoslav/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="https://github.com/AlexShchuka/mozgoslav/actions/workflows/release.yml"><img alt="Release" src="https://github.com/AlexShchuka/mozgoslav/actions/workflows/release.yml/badge.svg"></a>
  <a href="https://github.com/AlexShchuka/mozgoslav/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/AlexShchuka/mozgoslav?sort=semver"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

## What it does

- Records or imports audio locally; runs Whisper + VAD on-device via CoreML.
- Sends the cleaned transcript to an **LLM endpoint you control** (LM Studio, Ollama, any OpenAI-compatible host) for correction, summary, key points, action items.
- Writes structured Markdown straight into your Obsidian vault — no cloud sync, no account, no upload.
- Ships a push-to-talk dictation overlay backed by a native Swift helper.
- RAG / Q&A over notes, periodic aggregated summaries, speaker identification — tracked as GitHub Issues.

## Install

Apple Silicon only, macOS 14+.

1. Download the latest `Mozgoslav-<version>-arm64.dmg` from **[Releases](https://github.com/AlexShchuka/mozgoslav/releases/latest)**.
2. Drag to `Applications`.
3. First launch: right-click → Open (Gatekeeper warning is expected until signing ships — tracked in `docs/runbooks/release-dmg.md`).
4. In Settings, point the LLM endpoint at LM Studio / Ollama / any OpenAI-compatible URL.

No telemetry, no auto-update pings, no crash reporters, no account.

## Tech stack

```text
frontend/          Electron + React 19 + TypeScript (strict) + Redux-Saga + styled-components + i18next
backend/           C# 14 / .NET 10 ASP.NET Minimal API — EF Core (SQLite), HotChocolate GraphQL, Whisper.net, Serilog, OpenTelemetry
python-sidecar/    FastAPI — ML endpoints (diarisation, NER, gender, emotion). Optional; disabled by default.
native/            Swift 6 — push-to-talk helper, AVAudioEngine capture, accessibility text injection
```

Runtime topology: Electron main spawns the backend on `localhost:5050`; frontend talks GraphQL + subscriptions; native helper runs as a child process; optional Python sidecar at `localhost:5060`.

## Data & privacy

- Database: SQLite at `~/Library/Application Support/mozgoslav/db.sqlite`.
- Models: `~/Library/Application Support/Mozgoslav/models/`.
- Logs: Serilog rolling daily into `~/Library/Application Support/Mozgoslav/logs/`, 14-day retention. No in-app viewer.
- Kestrel binds `localhost` only. CORS restricted to `localhost` + `app://mozgoslav`.
- CSP: `default-src 'self'`; `connect-src` limited to `localhost:5050` (backend) and `localhost:5173` (dev server). No external hosts.
- Secrets (LLM API key, Obsidian token) live in the SQLite `settings` store. Never logged, never in env vars.

## Observability

`GET http://localhost:5050/metrics` — Prometheus scrape endpoint on loopback. Exposes `MozgoslavMetrics` custom counters (`mozgoslav_recordings_imported`, `mozgoslav_jobs_completed`, `mozgoslav_pipeline_transcription_duration`, …) plus ASP.NET Core and .NET runtime metrics. Point a local Grafana / Prometheus at it, or just:

```bash
curl -s http://localhost:5050/metrics | grep mozgoslav
```

## Documentation

- [`docs/product-vision.md`](./docs/product-vision.md) — the original product session: problem, architecture, decisions.
- [`docs/runbooks/agent-session.md`](./docs/runbooks/agent-session.md) — end-to-end flow for an AI coding session.
- [`docs/runbooks/release-dmg.md`](./docs/runbooks/release-dmg.md) — cutting a release + signing / notarisation checklist.
- [`docs/runbooks/backlog-migration.md`](./docs/runbooks/backlog-migration.md) — one-shot docs → GitHub Issues migration.
- [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) — operating manual for AI coding agents.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — human onboarding: deps, local gate, PR workflow, release.

## Develop

```bash
./scripts/demo.command      # boot backend + sidecar + UI in one terminal
bash scripts/agent-gate.sh  # full local reproduction of CI
```

Open work lives as **[GitHub Issues](https://github.com/AlexShchuka/mozgoslav/issues)** with `feature/<name>` + `type/{backlog|bug|decision}` labels. New work is filed via `.github/ISSUE_TEMPLATE/`.

## License

[MIT](./LICENSE).
