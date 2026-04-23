---
id: opencode-architecture
status: proposed
---

# opencode-architecture

## goal
Host the upstream OpenCode CLI as a first-class feature. Two sidebar entries:
`OpenCode` (full-window xterm) and `OpenCode Settings`.

## non-goals
- Native React chat UI over OpenCode's event protocol.
- Multi-session / multi-project workspace.
- Server/attach mode.
- MCP discovery UI (plain JSON editor in v1).

## decision
- UX: two sidebar entries, terminal-first.
- Renderer owns UI only; Electron main owns the PTY; backend owns
  provisioning, settings persistence, lifecycle SSE.
- Raw terminal bytes stay on the renderer↔main IPC path. Backend never sees them.
- Reuse existing privacy posture: zero telemetry, CSP untouched, secrets in
  SQLite `settings` behind the sensitive-input primitive.

## interfaces
```
GET  /api/opencode/status     → { installed, version, healthy, lastError }
GET  /api/opencode/runtime    → { binaryPath, configPath, cwd, env }
GET  /api/opencode/settings   → settings payload (secrets redacted)
PUT  /api/opencode/settings   → update + regenerate on-disk config
POST /api/opencode/install    → see opencode-provisioning
POST /api/opencode/update     → see opencode-provisioning
GET  /api/opencode/events     → SSE: started | stopped | crashed | installUpdated
POST /_internal/opencode/lifecycle  (Electron main → backend)
```

## state
- Binary + managed config under app-data dir `opencode/`.
- `cwd` (project path) persisted as a single settings key.

## rejected
| alt | reason |
|---|---|
| React chat over event stream | internal/versioned surface, maintenance debt |
| Backend-hosted PTY over WebSocket | see opencode-pty-ownership |
| One sidebar entry with inner tabs | two entries match the existing Settings/Logs/Backups split |

## graceful degradation
- Missing/incompatible binary → install card, not a failing terminal.
- Crash loop (exit within 10 s) → suppress restart, show log tail.
