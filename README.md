# Mozgoslav

> Voice-first personal harness over any LLM stack.
> Listens, remembers, acts — locally, on macOS.
> Privacy-first: nothing leaves the machine except calls to endpoints you configured yourself.

<p>
  <a href="https://github.com/AlexShchuka/mozgoslav/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/AlexShchuka/mozgoslav/actions/workflows/ci.yml/badge.svg?branch=main"></a>
  <a href="https://github.com/AlexShchuka/mozgoslav/actions/workflows/release.yml"><img alt="Release" src="https://github.com/AlexShchuka/mozgoslav/actions/workflows/release.yml/badge.svg"></a>
  <a href="https://github.com/AlexShchuka/mozgoslav/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/AlexShchuka/mozgoslav?sort=semver"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
</p>

## What it is

The Aristotle harness — voice-in, knowledge-and-actions-out, all local, all OSS.

Three product surfaces, glued by a single MCP bus:

1. **Voice → Structure.** Capture spontaneous thoughts, dictate into any app, record long-form sessions. Whisper transcribes on-device; profile-driven post-processing turns audio into structured Markdown in Obsidian.
2. **Unified Retrieval & Reasoning.** Ask a single question in voice or text — the agent decides whether to look in your own corpus, in your Obsidian vault, on the web (via local SearXNG), or all three, then fuses the answer with citations grouped by source.
3. **Intent → Action.** Background agents triage your inbox, extract action items, draft follow-ups, push reminders into reminders.app, and curate context for an external Claude Code / Claude Desktop session.

## What it does

### Voice → Structure

- **Long-form recording** with live streaming transcript. Stop → full pipeline (cleanup → correction → summary → Markdown → Obsidian).
- **Push-to-talk dictation** with on-the-fly LLM transform: text gets phrasing-cleaned, acronyms expanded, command-like utterances ("напомни в пятницу позвонить Васе") routed straight into Apple Shortcuts → reminders.app instead of being injected literally.
- **Voice dump-mode** — a global hotkey to record a thought to the inbox without opening the app. Auto-processed by the default profile on the next cron tick.
- **Profile-driven post-processing** — same recording, multiple interpretations (work / 1-1 / informal / custom prompt). Re-running creates a new versioned `ProcessedNote`; the source is immutable.
- **Per-stage timing visibility** on every long-running operation. No black boxes — you see which stage took how long, what failed, what the agent did.

### Unified Retrieval & Reasoning

- **Hybrid retrieval** over your note corpus (BM25 via SQLite FTS5 + dense embeddings + cross-encoder rerank in the Python sidecar).
- **Metadata filter** — date, profile, speaker. Query rewriter extracts filters from natural language.
- **Web search** via a self-hosted SearXNG sidecar that aggregates 70+ engines (Yandex, Google, DuckDuckGo, Bing, Wikipedia, ...). Configurable per-upstream from the Web Search settings page.
- **Web fetch + extract** via Trafilatura (RU-aware boilerplate cleaner). Cached by URL hash.
- **Unified search agent** — built on Microsoft Agent Framework, dispatches `corpus.query`, `web.search`, `web.fetch`, `obsidian.read` tools, then fuses with cite-by-source.
- **Voice-first Q&A.** Hotkey → dictation → unified search → answer in floating overlay or written into the Obsidian inbox.
- **Periodic aggregated summaries** — weekly and per-topic rollups regenerate incrementally as new notes arrive.

### Intent → Action

- **Mozgoslav as an MCP server** — exposes `corpus.query`, `recordings.search`, `notes.{get,list,create}`, `dictation.{start,stop}`, `obsidian.{read,write}`, `web.{search,fetch}`, `prompts.build` over MCP. Claude Desktop, Cursor, Continue.dev, or our own agent runner all use the same surface.
- **Mozgoslav as an MCP client** — consumes external MCP servers as additional tools.
- **Background skills** — Quartz-triggered (cron) or event-triggered MAF agents:
  - Post-recording action-extractor → `_inbox/actions/`.
  - Action items → reminders.app via Apple Shortcuts.
  - Morning digest of yesterday's recordings.
  - Inbox auto-process (scan `_inbox/raw/`, run default profile).
- **Prompt builder** — voice or hotkey dispatch curated context (RAG slice + recent notes + repo state) into Claude Code / Claude Desktop via clipboard or CLI. Mozgoslav is the prompt-builder + result-collector around external Claude.
- **System actions** — `ISystemAction` over the native helper invokes Apple Shortcuts: reminders, calendar entries, file ops in the vault.
- **Capability-aware** — `ILlmCapabilities` probes the configured LLM on connect (function-calling, JSON mode, ctx-length). Skills gate themselves to the model's real capabilities — no silent agentic loop blow-ups on a small local model.

### UI surfaces

- **Capture** page — recorder, drop-zone, dictation panel.
- **Library** page — recordings + processing jobs with per-stage timing.
- **Notes** page — processed notes with browseable people / topics / tags.
- **Ask** page — unified search Q&A; citations split by source-type (Corpus / Vault / Web).
- **Routines** page — cron / event-triggered skills, last run, status, manual trigger.
- **Prompts** page — CRUD for prompt templates, test-runner, hotkey dispatch.
- **Profiles** page — post-processing recipe editor.
- **Settings** — Models / Vault / Web Search / Sync / Backup / Agents runtime sub-tabs.
- **Floating overlay** — live transcript during recording, Q&A answer over any active app.


## Tech stack

```text
frontend/          Electron + React + TypeScript (strict) + Redux-Saga + styled-components + i18next
backend/           C# / .NET
                   - EF Core (SQLite) + EF migrations
                   - HotChocolate GraphQL + subscriptions
                   - Whisper.NET + Silero VAD
                   - Microsoft Agent Framework (agent runner + MCP server + MCP client)
                   - Quartz.NET (internal pipeline jobs + user-facing routines)
                   - Polly resilience for every outbound HTTP
                   - OpenTelemetry + Prometheus exporter
python-sidecar/    FastAPI — diarisation, NER, gender, emotion, embeddings, cross-encoder rerank, Trafilatura web extract.
searxng-sidecar/   SearXNG meta-search aggregator. Own venv, own lifecycle.
native/            Swift — push-to-talk helper, AVAudioEngine capture, accessibility text injection, Apple Shortcuts bridge.
```

Runtime topology: Electron main owns lifecycle of every subprocess (backend on `localhost:5050`, python-sidecar on `:5060`, searxng-sidecar on `:8888`, native helper as IPC child). Frontend talks GraphQL + subscriptions over loopback; everything else flows through the MCP bus.

## Data & privacy

- **Database.** SQLite at `~/Library/Application Support/Mozgoslav/db.sqlite`. Schema migrated via EF Core migrations (no `EnsureCreated` in production).
- **Models.** `~/Library/Application Support/Mozgoslav/models/` (Whisper, reranker, embedder).
- **Logs.** Serilog rolling daily into `~/Library/Application Support/Mozgoslav/logs/`, 14-day retention. Loopback-only; no remote sink.
- **Sidecars.** All three loopback-only. Kestrel binds `localhost`. CORS restricted to `localhost` + `app://mozgoslav`.
- **Outbound network policy** — exhaustive allowlist:
  - LLM endpoint (configured by the user; can be cloud).
  - Obsidian REST endpoint (configured).
  - Loopback sidecars (python-sidecar, searxng-sidecar).
  - SearXNG upstream search engines (configured per-upstream in Settings → Web Search; user-visible IP exposure).
  - Web fetches restricted to URLs that originated from SearXNG results in the current session.
  - Everything else denied.
- **Secrets.** LLM API keys, Obsidian token, MCP-server token — all in the SQLite `settings` store. Rendered through `<Input sensitive />`. Never logged, never in env vars.
- **Sandbox.** Background agents have access to MCP tools only; no shell, no arbitrary `bash`, no `process`. Tool execution stays inside the typed contract.

## Documentation

- [`docs/product-vision-2026-04.md`](./docs/product-vision-2026-04.md) — actual vision and architecture.
- [`docs/product-vision.md`](./docs/product-vision.md) — the original "second brain for conversations" idea, kept as historical record.
- [`docs/runbooks/agent-session.md`](./docs/runbooks/agent-session.md) — end-to-end flow for an AI coding session.
- [`docs/runbooks/release-dmg.md`](./docs/runbooks/release-dmg.md) — cutting a release + signing / notarisation checklist.
- [`AGENTS.md`](./AGENTS.md) (canonical) / [`CLAUDE.md`](./CLAUDE.md) (symlink) — operating manual for AI coding agents. Six principles, three pillars, outbound policy, Never-do / Ask-first / Always-do triage.
- Per-layer `AGENTS.md` in `backend/`, `frontend/`, `native/`, `python-sidecar/`, `searxng-sidecar/` — layer-specific commands and conventions.
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — human onboarding: deps, local gate, PR workflow, release.

## License

[MIT](./LICENSE).
