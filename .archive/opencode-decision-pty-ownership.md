---
id: opencode-pty-ownership
status: proposed
---

# opencode-pty-ownership

## goal
Pick the layer that allocates the PTY, spawns `opencode`, and moves bytes
to/from `xterm.js`.

## decision
Electron main owns the PTY (node-pty). Backend does not see raw bytes.

## rationale
- Existing repo pattern already spawns helper binaries from Electron main
  (Swift helper, backend launcher). Same supervision idiom, one more child.
- No extra hop on the latency-sensitive keystroke path.
- `node-pty` has prebuilt arm64 binaries; battle-tested under Electron.
- Backend keeps only what it must: provisioning, settings, lifecycle SSE.

## contract
```
main exposes on contextBridge:
  opencode.open(cwd)         — resolve runtime from backend, spawn PTY
  opencode.close()           — SIGTERM (grace) → SIGKILL
  opencode.write(data)       — keystrokes → PTY stdin
  opencode.resize(cols,rows)
  opencode.onData(cb)        — bytes from PTY → xterm
  opencode.onExit(cb)

main → backend:
  POST /_internal/opencode/lifecycle   { started | stopped | crashed }
```

## env policy
Child process sees only: `HOME`, `PATH`, `TERM=xterm-256color`, `LANG`,
`OPENCODE_CONFIG_DIR`. No other passthrough. Secrets never reach env — they
live in the generated config file.

## lifecycle
- Close window / close-session button → SIGTERM (5 s grace) → SIGKILL.
- Route change within the app → PTY stays alive.
- Crash loop guard: ≥2 exits within 10 s → stop auto-restart, surface log tail.

## rejected
| alt | reason |
|---|---|
| Backend PTY (Pty.Net) over WebSocket | extra hop, duplicate subprocess owner, CSP grant churn |
| Spawn from renderer | sandbox + contextIsolation forbid it |

## open
- Multi-session UX — deferred.
