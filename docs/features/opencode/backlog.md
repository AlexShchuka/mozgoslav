# opencode — backlog

- **server / attach mode.** `opencode serve` shared across tabs. Revisit when upstream server mode is stable.
- **multi-session tabs.** Multiple concurrent sessions in one window. Needs a PTY pool in main and a tab strip UI.
- **MCP discovery UI.** Browse registry, one-click install, per-server permissions. V1 is a JSON editor.
- **system `opencode` override.** Toggle to skip the managed binary. Widens support surface.
- **per-project settings.** Today one SQLite profile. Per-project overrides need a project registry and a merge order.
- **keychain-backed secrets.** Move LLM / GitHub tokens out of SQLite into macOS Keychain via the native helper. Needs a new contract between backend and helper.
- **native chat UI.** Replace the terminal with a Mozgoslav-native chat. Blocked on OpenCode exposing a stable structured event protocol.
