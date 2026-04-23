# Block 6 — Obsidian REST API client

- **Block owner:** developer agent.
- **Mac validation required:** partial (end-to-end check with real Obsidian + REST plugin on Mac).
- **Depends on:** Block 1 (green CI).
- **Parallel-safe with:** Blocks 2, 3, 4, 5.

---

## 1. Context

Obsidian export today is file-I/O only: `FileMarkdownExporter` writes `.md` files into the vault folder, Obsidian's file
watcher picks them up. This works, but two UX gaps exist:

1. **Open-in-Obsidian from Mozgoslav.** After a note is exported, the user often wants to open it directly. Without
   REST, we can only open the file via `shell.openPath` (macOS launches Obsidian or Finder depending on default app) —
   inconsistent.
2. **Bulk operations** — creating folder structure, ensuring Templater templates are in place, pinging Obsidian for sync
   status — all require shell-out today.

`backend/src/Mozgoslav.Application/Interfaces/IAppSettings.cs` and `AppSettingsDto` already carry `ObsidianRestApiToken`
and `ObsidianRestApiHost` fields that are plumbed all the way to the Settings UI. The actual client does not exist. Per
ADR-009 row 5, "extension point" is not acceptable — we implement.

## 2. Target design

### 2.1 Contract

```csharp
public interface IObsidianRestClient
{
    Task<bool> IsReachableAsync(CancellationToken ct);
    Task OpenNoteAsync(string vaultRelativePath, CancellationToken ct);
    Task<ObsidianVaultInfo> GetVaultInfoAsync(CancellationToken ct);
    Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct);
}

public sealed record ObsidianVaultInfo(string Name, string Path, string Version);
```

Implementation: `ObsidianRestApiClient` in `Mozgoslav.Infrastructure.Services`. Uses `HttpClient` via
`IHttpClientFactory` ("Mozgoslav.Obsidian" named client). Auth: `Authorization: Bearer <token>`.

### 2.2 Graceful fallback

`IObsidianRestClient.IsReachableAsync` must be fast (< 500 ms timeout) and non-throwing. When it returns `false`:

- `OpenNoteAsync` falls back to `shell.openPath(vaultRoot/<path>)` via Electron IPC (`open-path:request`).
- `EnsureFolderAsync` falls back to direct file-I/O `Directory.CreateDirectory`.
- `GetVaultInfoAsync` falls back to `{ Name: Path.GetFileName(vaultRoot), Path: vaultRoot, Version: "unknown" }`.

This keeps the feature honest per ADR-009: the file-I/O path is the ground truth; REST is opportunistic enhancement.

### 2.3 Endpoints used (from Obsidian Local REST API plugin spec)

| Obsidian REST        | Method           | Purpose                                               |
|----------------------|------------------|-------------------------------------------------------|
| `GET /`              | health probe     | IsReachable                                           |
| `GET /vault/`        | enumerate root   | GetVaultInfo (folder count heuristic)                 |
| `POST /open/<path>`  | opens note in UI | OpenNoteAsync                                         |
| `PUT /vault/<path>/` | create folder    | EnsureFolderAsync (PUT with directory trailing slash) |

REST plugin URL defaults to `https://127.0.0.1:27124` (self-signed cert — pin via `X-Obsidian-Allow-Self-Signed: true`
or disable cert validation for localhost). Token comes from Settings.

### 2.4 UI integration

- In `frontend/src/features/Notes/NoteViewer`: "Open in Obsidian" button calls `POST /api/obsidian/open { path }`.
  Backend routes to `IObsidianRestClient.OpenNoteAsync` or the fallback.
- In Settings → Obsidian: "Test REST connection" button that calls `GET /api/obsidian/rest-health` → shows reachable /
  unreachable / misconfigured with diagnostic hints.
- `features/Obsidian/ObsidianTab`: show a badge "REST: connected" / "REST: using file-I/O fallback".

## 3. Tasks

1. Create `Mozgoslav.Application.Interfaces.IObsidianRestClient`.
2. Create `Mozgoslav.Infrastructure.Services.ObsidianRestApiClient`.
3. Register `IObsidianRestClient` in DI (Scoped) and the named `HttpClient` with cert-pinning config.
4. New endpoint `POST /api/obsidian/open { path }` in `ObsidianEndpoints.cs`.
5. New endpoint `GET /api/obsidian/rest-health` returning `{ reachable, host, version?, diagnostic }`.
6. Update `FileMarkdownExporter` (or a new `ObsidianPostExportHook`) to optionally call
   `IObsidianRestClient.OpenNoteAsync` after export if the user has `autoOpenAfterExport` set in settings (default off —
   behaviour unchanged for existing users).
7. Update `ObsidianBulkExportService` to use `IObsidianRestClient.EnsureFolderAsync` with fallback to
   `Directory.CreateDirectory`.
8. Frontend: `features/Notes/NoteViewer` "Open in Obsidian" button + API hook.
9. Frontend: Settings → Obsidian "Test connection" button + diagnostic panel.
10. Unit tests with WireMock for the client: happy path, unreachable, 401 (bad token), cert mismatch.
11. Integration tests wiring the client + fallback paths through a real `FileMarkdownExporter` run.

## 4. Acceptance criteria

- `IObsidianRestClient.IsReachableAsync` returns `true` against a running Obsidian with the Local REST API plugin and
  the correct token; returns `false` in all other cases without throwing or leaking exceptions.
- Every REST method has a fallback path; integration tests cover both the reachable and unreachable paths.
- "Open in Obsidian" works from the Note viewer end-to-end on Mac (shuka validation).
- Settings "Test connection" gives the user a clear reason why REST is or is not working.

## 5. Non-goals

- Two-way sync (Obsidian edit → Mozgoslav note reload) — out of v0.8.
- Obsidian Community plugins other than Local REST API — out of scope.
- Templater-driven note rendering via REST — file-I/O side already generates Markdown; Templater receives it through its
  own file watcher.

## 6. Open questions (agent flags if hit)

- The Local REST API plugin uses a self-signed cert. On .NET 10 we cannot easily skip cert validation per-request;
  options: (a) add a `HttpClientHandler.ServerCertificateCustomValidationCallback` scoped to `127.0.0.1`, (b) use the
  plugin's HTTP (non-TLS) mode — less secure but sidestepped. Default: (a), validation callback limited to localhost.
- If the user has the REST plugin but no token configured, the client must not error noisily — treat as unreachable.
  Verify this path in tests.

## 7. Mac validation checklist (shuka)

1. Install Obsidian Local REST API plugin in a test vault.
2. Copy the token into Mozgoslav Settings → Obsidian.
3. Click "Test connection" — expect "Connected, version vX.Y.Z".
4. Export a note from Mozgoslav → click "Open in Obsidian" → Obsidian focuses the note in the correct vault.
5. Disable plugin, re-export → Obsidian still opens via file-I/O fallback. "Open in Obsidian" shows "using file-I/O
   fallback" toast.
6. Report `block6-mac-validation-2026-04-YY.md`.

---

## 8. Checkpoint summary (Agent B + Resume Agent, 2026-04-17)

- Files added: `backend/src/Mozgoslav.Application/Interfaces/IObsidianRestClient.cs`,
  `backend/src/Mozgoslav.Infrastructure/Services/ObsidianRestApiClient.cs` (typed `HttpClient`, base URL
  `http://127.0.0.1:27123`, bearer token from settings, 5 s timeout),
  `backend/src/Mozgoslav.Api/Endpoints/ObsidianEndpoints.cs` extended with `POST /api/obsidian/open` (note id →
  `/open/<vault-relative path>`) and `GET /api/obsidian/rest-health` (probes `/` then `/active`, returns version +
  reachable flag).
- Graceful fallback: when REST is unreachable, `POST /api/obsidian/open` falls back to
  `obsidian://open?vault=...&file=...` URI scheme via `IShellLauncher` so Obsidian still focuses the note.
- Tests: WireMock-backed `ObsidianRestApiClientTests` (happy path, 401, 404, network down) and endpoint tests
  `ObsidianEndpointsTests` (REST path + URI fallback).
- Deviations from plan: none.
- Open: shuka Mac validation per §7 (real Local REST API plugin install + token round-trip).
