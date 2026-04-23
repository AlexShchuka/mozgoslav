---
adr: 023
title: OpenCode settings surface — schema, config generation, secrets
status: Proposed
date: 2026-04-23
priority: mid
related: [ADR-020, ADR-021, ADR-022]
authors: [shchuka]
machine_readable: true
---

# ADR-023 — OpenCode settings surface

## 1. GOAL

Define what the user configures in the `/opencode/settings` tab, where each
value lives (SQLite vs on-disk config), and how settings become the config
file that the spawned `opencode` reads. Secrets must follow the existing
`<Input sensitive />` + SQLite `settings` pattern — never logged, never on
disk in plaintext outside user-only permissions.

## 2. NON-GOALS

- N1. Discovering, installing, or sandboxing MCP servers. V1 = user edits a
  JSON list and Mozgoslav writes it to disk for OpenCode.
- N2. Per-project settings inside one SQLite row. V1 is single-profile.
  Per-project overrides are ADR-014.
- N3. Live-reloading OpenCode when settings change. V1 requires restart of
  the terminal session (same as changing a profile in other tools).
- N4. Importing existing `~/.opencode/config.json`. Mozgoslav writes its own
  managed config file and never touches a user's pre-existing install
  (ADR-021 also mandates a Mozgoslav-owned binary path).

## 3. CONTEXT

- `EfAppSettings` (singleton, backed by SQLite `settings` table) is already
  the canonical store for secrets and per-user knobs in Mozgoslav. Frontend
  binds to it via `/api/settings`.
- `<Input sensitive />` is the documented convention (`CLAUDE.md` — Frontend
  conventions) for fields that must not be echoed or logged.
- OpenCode itself reads its own config file at a configurable path
  (`OPENCODE_CONFIG_DIR`, per ADR-022). Mozgoslav controls that path, so the
  contract is one-way: SQLite → generated file → OpenCode.
- Upstream OpenCode configuration is versioned. We treat its schema as an
  opaque shape owned by the selected pinned version (ADR-021) — Mozgoslav
  does not try to abstract it.

## 4. DECISION

### 4.1 Setting storage split

| Setting                              | Where                         | Rationale |
|--------------------------------------|-------------------------------|-----------|
| LLM provider (ollama / lmstudio / anthropic / openai-compat) | SQLite `settings` | Shared concept with existing app; don't duplicate. |
| LLM base URL (per provider)          | SQLite `settings`             | Mirrors existing `Mozgoslav:OpenAi*` pattern. |
| LLM API key (per provider)           | SQLite `settings`, sensitive  | Must never leak to logs or env. |
| Main / reasoning / fast model names  | SQLite `settings`             | Three explicit slots, model matrix from the integration note. |
| Enabled MCP servers (list of structs) | SQLite `settings`            | One JSON blob under key `opencode.mcp`. |
| GitHub PAT for the GitHub MCP        | SQLite `settings`, sensitive  | Same treatment as any token. |
| Enabled built-in agents              | SQLite `settings`             | Small string[] of agent IDs. |
| OpenCode's own agents/commands dir   | Managed on-disk path          | Read by OpenCode directly; Mozgoslav only resolves path. |
| Project cwd (`opencode.lastProjectPath`) | SQLite `settings`         | Needed before spawn; single value in v1. |

All SQLite-stored values are exposed through one endpoint pair
(`GET`/`PUT /api/opencode/settings`) that maps the domain payload below to
and from the key/value `settings` rows.

### 4.2 Domain payload

```csharp
public sealed record OpencodeSettings(
    OpencodeLlm Llm,
    OpencodeModels Models,
    IReadOnlyList<OpencodeMcpServer> Mcp,
    IReadOnlyList<string> EnabledAgents,
    string? LastProjectPath);

public sealed record OpencodeLlm(
    string Provider,          // "ollama" | "lmstudio" | "anthropic" | "openai-compat"
    string BaseUrl,
    string? ApiKeyRef);       // id of the secret row in `settings`, not the value

public sealed record OpencodeModels(
    string MainCoding,
    string? Reasoning,
    string? FastHelper);

public sealed record OpencodeMcpServer(
    string Id,
    string Kind,              // "github" | "docs" | "filesystem" | "custom"
    bool Enabled,
    IReadOnlyDictionary<string, string> Args,
    string? SecretRef);       // optional pointer to a SQLite secret row
```

Secrets are referenced by `*Ref` keys; the actual secret value is looked up
inside the backend when regenerating the config file. Secrets never round-trip
through the API payload.

### 4.3 Config regeneration

On every `PUT /api/opencode/settings`, `OpencodeSettingsService`:

1. Writes the domain payload to SQLite.
2. Resolves secrets by `*Ref` → in-memory values.
3. Renders two files under `.../opencode/config/`:
   - `opencode.json` — OpenCode's native shape for the pinned version.
   - `mcp.json` — MCP server list in OpenCode's native shape.
4. Writes both via temp + `File.Move` (atomic, same as `ModelDownloadService`)
   with Unix mode `0600` (`File.SetUnixFileMode`).
5. Publishes `settings-regenerated` on the internal notifier so the terminal
   tab can surface a "restart session to apply" toast (we do NOT hot-restart
   — user may be mid-task).

The renderer (pure function, well-tested) lives at
`Mozgoslav.Infrastructure.Services.OpencodeConfigRenderer` with no I/O —
tests in `Mozgoslav.Tests` (unit) exercise all provider/model/MCP matrix
combinations.

### 4.4 Frontend form

`OpenCodeSettings.tsx` is a container/presentational pair following the
Settings feature pattern:

- Section "LLM endpoint" — provider select + base URL + API key
  (`<Input sensitive />`).
- Section "Models" — three model name inputs with placeholder presets drawn
  from a small catalog constant (`src/constants/opencodeModelPresets.ts`).
  Plain inputs, no autodiscovery.
- Section "MCP servers" — list with Add / Enable / Delete. Custom servers
  have a "args" JSON editor using the existing JSON primitive (or a
  bare textarea with client-side JSON.parse validation).
- Section "Agents" — checkbox list. Agent IDs come from a static catalog
  constant shipped with the frontend (not live-queried — v1).

Every string is translated via `useTranslation`; keys added to both
`ru.json` and `en.json`.

### 4.5 Validation

Backend validates on PUT:

- Provider in allowed set.
- Base URL is a valid absolute URI with `http` or `https`.
- Model names are non-empty.
- MCP server IDs unique.
- Secret refs resolve to existing rows.

Invalid payload → `400` with a per-field error list. Frontend already has a
form-error primitive (used in Settings / Obsidian) — reused.

### 4.6 Secret handling

- `apiKeyRef` and `secretRef` values point at rows in the existing
  `settings` table with key prefix `opencode.secret.*`.
- `GET /api/opencode/settings` returns `hasApiKey: true/false` instead of
  the key itself — matches the existing `Obsidian` settings pattern.
- `PUT` accepts a sentinel value for "keep existing" (`null` on the
  corresponding field) so the UI never round-trips secrets.
- Logs are explicitly scrubbed: the config renderer calls `Log.Logger` at
  `Debug` level only with `ApiKey = "<redacted>"`.

## 5. ALTERNATIVES CONSIDERED

- **Let OpenCode read its usual config under `~/.opencode/`.** Rejected: that
  would mix Mozgoslav's managed surface with the user's ambient install and
  make state hard to reason about.
- **Store settings directly in the generated config file (no SQLite).**
  Rejected: SQLite is the single source of truth across the app; forking
  that for one feature is churn and makes backup/restore inconsistent.
- **One SQLite row with a blob JSON per provider, discovered at runtime.**
  Rejected for v1; the typed C# record is clearer and lets the form bind
  directly. Revisit if the settings shape grows.

## 6. CONSEQUENCES

- Config renderer becomes a tight integration with upstream OpenCode's
  config schema. When OpenCode ships a breaking change we bump the pinned
  version in the catalog (ADR-021) AND update the renderer in the same MR.
- Zero new DB tables. New key prefixes only (`opencode.*`).
- Backup (v1 backup endpoint already zips `settings`) automatically covers
  OpenCode state. Restore is equally transparent.
- Secrets remain keyboard-only (user pastes them); we do not auto-fetch from
  Keychain in v1. Deferred to the Swift helper if we bring it into
  OpenCode's path later (ADR-014).

## 7. OPEN QUESTIONS

- **OQ-1.** Should `OpencodeConfigRenderer` be versioned with the pinned
  OpenCode version (multiple renderers at once)? Default: no, we ship one
  renderer per pinned version and update both in lockstep.
- **OQ-2.** Agent catalog source — static constant vs
  `opencode list agents` parsed on install? Default: static for v1, scrape
  from binary once the install flow is stable.
