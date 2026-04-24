---
id: opencode-settings
status: proposed
---

# opencode-settings

## goal
Define the configuration surface, storage location, and the path by which it
reaches the spawned `opencode`.

## decision
- Single source of truth: the existing SQLite `settings` key/value store
  (no new tables, no new secret store).
- Secrets referenced by opaque `*Ref` keys; values resolved only when
  rendering the on-disk config. API payloads never carry secret values.
- Every settings write regenerates `opencode.json` + `mcp.json` under the
  managed config dir, atomically (tmp → move), mode `0600`.
- No hot-reload: the API returns a "restart session to apply" signal. Never
  interrupt a running session on a settings write.

## domain shape
```
OpencodeSettings {
  llm:     { provider, baseUrl, apiKeyRef? },
  models:  { mainCoding, reasoning?, fastHelper? },
  mcp:     [{ id, kind, enabled, args, secretRef? }],
  agents:  [id],
  lastProjectPath?
}
```

## storage rules
- All knobs + secret refs live under `opencode.*` keys in `settings`.
- Secret values live under `opencode.secret.*` keys, never exposed over API.
- `GET settings` returns `hasApiKey: bool` instead of the key itself.
- `PUT settings` accepts `null` on a secret field as "keep existing".

## validation
- Provider in allowed set.
- Base URL is absolute http(s).
- Non-empty model slot for `mainCoding`.
- Unique MCP ids, resolvable secret refs.
- 400 with per-field errors on failure.

## renderer
- Pure function of (domain payload × resolved secrets) → file contents.
- Unit-tested; no I/O in the function itself.
- Versioned in lockstep with the pinned OpenCode version.

## rejected
| alt | reason |
|---|---|
| Ambient `~/.opencode/` config | mixes managed surface with any external install |
| Store directly in generated file | splits source-of-truth from the rest of the app |
| One JSON blob per provider, discovered at runtime | form-binding churn; typed record is clearer at v1 |

## open
- Keychain-backed secrets via the native helper — deferred.
- Agent catalog scraped from the binary vs static — deferred to v2.
