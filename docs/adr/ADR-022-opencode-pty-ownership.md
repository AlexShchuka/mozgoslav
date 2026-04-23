---
adr: 022
title: OpenCode PTY ownership — Electron main vs backend
status: Proposed
date: 2026-04-23
priority: mid
related: [ADR-020]
authors: [shchuka]
machine_readable: true
---

# ADR-022 — OpenCode PTY ownership

## 1. GOAL

Pick the layer that owns the pseudo-terminal (PTY) behind the OpenCode tab,
defined in ADR-020. "Owning the PTY" means: allocating it, spawning
`opencode` attached to it, forwarding bytes to `xterm.js` in the renderer,
forwarding keystrokes and resize events back.

## 2. NON-GOALS

- N1. Reinventing a terminal protocol. `xterm.js` + standard PTY bytes are the
  contract.
- N2. Supporting terminal multiplexing (tmux/screen) inside a single tab.
- N3. Full `process.env` passthrough. Only a curated env set (LLM endpoint,
  API keys, project cwd, OpenCode config path) reaches the child.

## 3. CONTEXT

`xterm.js` needs a byte stream and a size. Somewhere in the stack, a PTY is
allocated. Two real options:

**Option A — Electron main hosts `node-pty`.**
- `node-pty` is the de-facto Electron/VS Code terminal library; pre-built
  binaries for darwin-arm64; small API.
- Mozgoslav's Electron main already spawns and owns helper processes:
  `NativeHelperClient.ts` (Swift helper with JSON-RPC over stdio) and
  `backendLauncher.ts` (C# backend as child). There is precedent and a
  supervision idiom already.
- Bytes flow renderer ↔ main over existing IPC (`contextBridge`,
  `ipcMain.handle`). No new transport.
- Config: PTY is allocated per-tab, scoped to a `BrowserWindow`. When the
  window closes or navigates away, PTY dies with it.

**Option B — Backend hosts a PTY (e.g., `Pty.Net`) and exposes a WebSocket.**
- Aligns with "backend owns all subprocesses" as an architectural purity
  principle.
- Better for integration tests against `ApiFactory` — the PTY lifecycle is
  reachable by the existing test harness.
- Adds a native dep on the .NET side (Pty.Net uses `winpty`/`libutil`) and a
  new WebSocket endpoint. Electron CSP already allows `ws://localhost:5173`
  (dev) but not yet `ws://localhost:5050` — new CSP grant needed.
- Adds a hop renderer → main → backend (WS) → PTY, for a feature whose value
  is low latency.

## 4. DECISION

Pick **Option A — `node-pty` in Electron main.**

Rationale, anchored to the codebase:

1. **Precedent already exists and is shallow.** `NativeHelperClient` is a
   straight-line `child_process.spawn` + stdio pipe + IPC bridge. A PTY
   wrapper is the same shape with `pty.spawn` in place of `child_process.spawn`
   and "bytes" instead of "JSON-RPC lines". Reusing this mental model is
   cheaper than introducing a second subprocess owner in another language.
2. **No new cross-process hop for a latency-sensitive path.** Keystrokes go
   renderer → main → PTY. Option B adds a C# middleman that contributes
   nothing except symmetry.
3. **Tool fit.** `node-pty` is battle-tested under Electron and ships
   pre-built arm64 binaries; Pty.Net on Apple Silicon is less well-trodden
   and historically has native-build foot-guns.
4. **Backend still owns what it should.** Provisioning (ADR-021), settings
   and secrets (ADR-023), runtime resolution and lifecycle SSE remain in the
   backend. Only the raw byte pipe lives in Electron main. The backend learns
   about lifecycle transitions via `POST /_internal/opencode/lifecycle`
   (renderer → main → backend), mirroring the existing
   `/_internal/hotkey/event` and `/_internal/devices/changed` endpoints from
   `SseEndpoints.cs`.
5. **Testability is preserved.** The wrapper is a thin, pure-TypeScript
   module with an injectable `spawnFn`. Unit tests use the existing Jest
   harness; a small end-to-end smoke test runs under Electron's test runner
   if we add one later.

## 5. CONTRACT

### 5.1 Electron main module

`frontend/electron/opencode/OpencodeProcess.ts`:

```ts
export interface OpencodeProcessOptions {
  readonly binaryPath: string;
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
  readonly cols: number;
  readonly rows: number;
}

export class OpencodeProcess extends EventEmitter {
  start(options: OpencodeProcessOptions): void;
  write(data: string): void;          // keystrokes from renderer
  resize(cols: number, rows: number): void;
  stop(graceMs?: number): Promise<void>;
  // emits: "data" (bytes), "exit", "error"
}
```

Single instance per `BrowserWindow`; multi-session tabs are ADR-014 backlog.

### 5.2 Preload / IPC bridge

Add to `preload.ts`:

```ts
window.mozgoslav.opencode = {
  open(cwd: string): Promise<void>,
  close(): Promise<void>,
  write(data: string): void,
  resize(cols: number, rows: number): void,
  onData(cb: (chunk: string) => void): () => void,
  onExit(cb: (info: { code: number | null; signal: string | null }) => void): () => void,
};
```

All methods go through `ipcRenderer.invoke` / `ipcMain.handle`, matching the
existing bridge style. `onData` / `onExit` use `ipcRenderer.on` with a
disposer for leak-safety.

### 5.3 Backend-visible lifecycle

Electron main POSTs to `/_internal/opencode/lifecycle` on
`started | stopped | crashed`. Backend stores last status in memory and
publishes on `/api/opencode/events` (SSE). This matches the
`/_internal/hotkey/event` pattern: Electron is the authority on low-level
events, backend is the fan-out hub.

### 5.4 Environment curation

Only the following env vars are passed to `opencode`:

- `HOME`, `PATH`, `TERM` (set to `xterm-256color`), `LANG`.
- `OPENCODE_CONFIG_DIR` → generated path from ADR-023.
- Nothing else from `process.env`. No automatic key leakage.

Secrets are in the generated config, not in env, following the same
principle as `Mozgoslav:SyncthingApiKey` today (header-scoped, not
env-scoped).

### 5.5 Window lifecycle

- Window close → `OpencodeProcess.stop(5_000)` → SIGTERM → grace → SIGKILL,
  same pattern as `backendLauncher.ts`.
- Navigate away from `/opencode` → PTY stays alive (user may switch back
  mid-task). Stopped only when the user clicks "Close session" on the tab.

## 6. CONSEQUENCES

- New runtime dep: `node-pty`. Adds a native build step on `npm install`
  (darwin-arm64 prebuilt usually satisfies Apple Silicon; `node-gyp`
  fallback only if the install tree shifts).
- `preload.ts` and `main.ts` gain one new bridge surface; the
  `window.mozgoslav` contract is extended — both sides are updated in the
  same MR per existing convention.
- Backend does not learn of raw bytes. Integration tests for OpenCode only
  cover provisioning + settings + lifecycle SSE, not terminal IO. Terminal
  IO is covered by a thin Jest unit test + manual smoke in the Electron
  window.
- No new CSP grant is needed. No new WS origin is needed.

## 7. OPEN QUESTIONS

- **OQ-1.** Multi-session tabs (2+ OpenCode windows at once) — how does the
  sidebar surface them? Deferred to ADR-014.
- **OQ-2.** Crash loop guard — if OpenCode exits within `<N>` seconds of
  start, suppress auto-restart and surface the log tail. Mirrors
  `backendLauncher.ts` behaviour. Default N = 10 s; revisit post-v1.
