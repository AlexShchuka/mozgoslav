---
adr: 020
title: OpenCode integration — architecture and UX shape
status: Proposed
date: 2026-04-23
priority: mid
related: [ADR-011, ADR-017, ADR-019]
authors: [shchuka]
machine_readable: true
---

# ADR-020 — OpenCode integration — architecture and UX shape

## 1. GOAL

Add [OpenCode](https://opencode.ai) (local coding assistant CLI) as a first-class
feature of Mozgoslav so the user can:

- Open a dedicated **sidebar entry "OpenCode"** → route `/opencode`, rendering a
  full-window `xterm.js` terminal that hosts a live `opencode` TUI.
- Open a dedicated **sidebar entry "OpenCode Settings"** → route
  `/opencode/settings`, exposing model routing, MCP enablement and agent
  selection consumed by `opencode`.

Integration must preserve the privacy posture from `README.md`: zero telemetry,
no network traffic except the LLM / MCP endpoints the user explicitly
configured, secrets in the SQLite `settings` table.

## 2. NON-GOALS

- N1. Reimplementing the OpenCode agent/command system inside Mozgoslav. We
  host the real binary — OpenCode owns agents, commands, plan-mode, `@file`.
- N2. Native React chat UI over the OpenCode event protocol. V1 is terminal.
- N3. Multi-session / multi-project workspace UI. V1 = one session bound to a
  single filesystem path.
- N4. Deep MCP discovery/install UI. V1 = JSON config editor with validation.
- N5. OpenCode running in server/attach mode or shared across users. Local
  subprocess only.

## 3. CONTEXT

Existing architecture has two proven patterns that this feature piggybacks on:

- `frontend/electron/utils/backendLauncher.ts` and
  `frontend/electron/dictation/NativeHelperClient.ts` already spawn external
  binaries (the C# backend and the Swift dictation helper) from Electron main
  with stdout/stderr streaming and SIGTERM/SIGKILL grace. OpenCode is another
  helper of the same shape, with one addition — a PTY (terminal-shaped pipe).
- `Channel<T>` fan-out + SSE (`ChannelJobProgressNotifier`,
  `/api/jobs/stream`, `/api/dictation/stream`) is already the canonical way to
  broadcast backend lifecycle events to the renderer. OpenCode lifecycle
  events (started/stopped/crashed/installUpdated) reuse that pattern.
- SQLite `settings` (`EfAppSettings`) already stores secrets behind
  `<Input sensitive />`. OpenCode's LLM API keys and GitHub PAT reuse it.

Why this matters: no new transports, no new cross-cutting primitives, no new
secret stores. The feature decomposes into three orthogonal decisions, which
are split into their own ADRs.

## 4. DECISION

### 4.1 UX shape — terminal-first, two sidebar entries

- `ROUTES.opencode = "/opencode"` — full-window `xterm.js` pane inside the
  shared `Layout`. No in-feature chrome beyond the sidebar + `TitleBar`.
- `ROUTES.opencodeSettings = "/opencode/settings"` — a standard
  container/presentational feature page with forms for model routing, MCP
  enablement, and agent selection.
- Two `NavItem`s in `Layout.tsx`, grouped in the same `SidebarGroup` as
  `Profiles` / `Models` / `Obsidian` (feature-level tools) rather than in the
  system group.

Rationale: users of OpenCode are already comfortable with its TUI; rebuilding
a React chat over its event protocol is churn in v1 and couples us to an
internal, versioned surface. Terminal is a stable interface.

Rejected: one sidebar entry with internal tabs. User explicitly asked for
separate menu entries, and it matches how `Settings` / `Logs` / `Backups`
split today (three entries, not one "System").

### 4.2 Layered split

```
renderer (React)                electron main                backend (.NET)
──────────────────              ─────────────────            ──────────────
/opencode           ─IPC──────▶ OpencodeProcess      ─HTTP──▶ /api/opencode/runtime
  xterm.js pane     ◀── bytes─  (node-pty wrapper)            /api/opencode/settings
                                       │                      /api/opencode/status
/opencode/settings  ─HTTP──────────────┼─────────────────────▶ /api/opencode/events (SSE)
                                       ▼
                                   opencode (bin)
                                       │
                                       ▼
                                   Ollama / LM Studio / Anthropic
                                   MCP servers (GitHub, docs, …)
```

Ownership:

- **Renderer** — UI, keybindings, settings forms. Never touches child
  processes (Electron `sandbox: true` + `contextIsolation: true` —
  `nodeIntegration: false` precludes it anyway).
- **Electron main** — PTY lifecycle, bytes pipe, spawn/kill (decision and
  rationale in ADR-022).
- **Backend** — binary provisioning (ADR-021), settings persistence (ADR-023),
  runtime resolution (compose env + config path + cwd), high-level lifecycle
  SSE. Raw terminal bytes never go through the backend.

### 4.3 New HTTP endpoints

Implemented as `backend/src/Mozgoslav.Api/Endpoints/OpencodeEndpoints.cs`
following the `Api/Endpoints/Foo.cs` + `MapFooEndpoints()` convention from
`CLAUDE.md`.

```
GET  /api/opencode/status     → { installed, version, binaryPath, healthy, lastError }
GET  /api/opencode/runtime    → { binaryPath, configPath, cwd, env }
                                (consumed by Electron main before spawn)
GET  /api/opencode/settings   → current settings payload
PUT  /api/opencode/settings   → update + regenerate on-disk OpenCode config
POST /api/opencode/install    → trigger download (ADR-021)
POST /api/opencode/update     → trigger version update (ADR-021)
GET  /api/opencode/events     → SSE: started|stopped|crashed|installUpdated
```

Raw terminal I/O is explicitly NOT an HTTP endpoint — see ADR-022.

### 4.4 Filesystem layout

Under `~/Library/Application Support/mozgoslav/opencode/`:

```
opencode/
├── bin/opencode              sha256-pinned binary (ADR-021)
├── bin/opencode.version      { version, sha256, installedAt }
└── config/                   regenerated from SQLite settings on every PUT
    ├── opencode.json         OpenCode's own config
    └── mcp.json              MCP server list (JSON written by Mozgoslav)
```

Project cwd (the folder OpenCode opens into) is persisted in SQLite under
`opencode.lastProjectPath` and picked once via the existing `openFolder()`
bridge. A folder picker gate blocks `/opencode` if no cwd is set.

### 4.5 Frontend module layout

```
frontend/
├── electron/opencode/
│   ├── OpencodeProcess.ts     PTY wrapper, lifecycle, IPC bridge
│   ├── runtimeClient.ts       calls GET /api/opencode/runtime
│   └── types.ts
├── src/
│   ├── features/OpenCode/
│   │   ├── index.ts
│   │   ├── OpenCode.tsx              xterm.js host, full-window
│   │   ├── OpenCode.style.ts
│   │   ├── OpenCode.container.ts
│   │   ├── OpenCodeSettings.tsx
│   │   ├── OpenCodeSettings.style.ts
│   │   ├── OpenCodeSettings.container.ts
│   │   └── types.ts
│   ├── api/OpencodeApi.ts
│   └── store/slices/opencode/        actions/reducer/mutations/selectors/saga
```

The `slices/opencode` slice uses `slices/recording` as canonical reference.
It holds runtime status and settings draft; raw terminal bytes are NOT in
Redux — they flow renderer ↔ main directly over IPC.

### 4.6 Privacy guarantees

- CSP in `electron/main.ts` already permits `http://localhost:5050`. No new
  origins needed; OpenCode itself talks to user-configured endpoints.
- Mozgoslav adds zero telemetry and zero auto-update pings around OpenCode.
- LLM API key, Anthropic key, GitHub PAT for MCP — stored in SQLite
  `settings`, never logged, rendered with `<Input sensitive />`, and pushed
  to OpenCode only through the regenerated config file under user-only
  permissions (`0600`).

## 5. ALTERNATIVES CONSIDERED

- **Native React chat UI on top of the OpenCode event stream.** Rejected:
  large, versioned, internal surface; reinvents UI that already exists; v1
  churn. Revisit in a post-v1 ADR if we want brandable chat.
- **Backend-hosted OpenCode with PTY via WebSocket (Pty.Net).** Rejected in
  ADR-022; see that doc for rationale. Short version: Electron already owns
  helper lifecycle, adding C# PTY duplicates node-pty and adds a hop.
- **Single sidebar entry with internal tabs.** Rejected on user request and
  to stay consistent with existing Settings/Logs/Backups separation.
- **Bundling OpenCode inside the DMG.** Deferred to ADR-021 where the trade-off
  (bundle size vs first-run network) is assessed.

## 6. CONSEQUENCES

- New runtime dep: `node-pty` (native). Adds a build step on
  `npm install`; already works on Apple Silicon out of the box.
- OpenCode binary on disk adds 60–150 MB. Bundled vs on-demand decided in
  ADR-021.
- Backend gains `OpencodeRuntimeService`, `OpencodeSettingsService`,
  `OpencodeProcessStatusNotifier`. No new DB tables in v1 — settings ride
  on the existing key/value `settings` table.
- Tests: `backend/tests/Mozgoslav.Tests.Integration/OpencodeRuntimeTests.cs`
  (runtime resolution, config regeneration, settings CRUD) using the
  existing `ApiFactory` + `TestDatabase`. Frontend tests cover the slice
  with `redux-saga-test-plan` + minimal xterm harness (DOM-stubbed).
- Graceful degradation (ADR-011 style): if the binary is missing or
  incompatible, `/opencode` renders an install card (invokes `POST
  /api/opencode/install`) instead of a failing terminal.

## 7. OUT OF SCOPE (forward-referenced)

- ADR-021 — binary provisioning (install / check / update / rollback).
- ADR-022 — PTY ownership (Electron main vs backend).
- ADR-023 — settings schema and config regeneration contract.
- ADR-014 — multi-session tabs, server/attach mode, MCP discovery UI.
