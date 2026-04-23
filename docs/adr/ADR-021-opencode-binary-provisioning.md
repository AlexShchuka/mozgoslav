---
adr: 021
title: OpenCode binary provisioning — install / check / update
status: Proposed
date: 2026-04-23
priority: mid
related: [ADR-011, ADR-020]
authors: [shchuka]
machine_readable: true
---

# ADR-021 — OpenCode binary provisioning

## 1. GOAL

Reliably provide an `opencode` binary to the host machine so ADR-020's
terminal tab can spawn it. Handle first-run install, version check, update,
and rollback without leaking privacy or breaking the hardened Electron
runtime.

## 2. NON-GOALS

- N1. Auto-updating on app launch. Update is a user-triggered action.
- N2. Supporting arbitrary user-installed `opencode`. V1 manages its own copy
  under Mozgoslav's app-data dir. A "use system opencode" override is deferred
  to ADR-014.
- N3. Linux / Windows builds. macOS Apple Silicon only for v1 (matches the
  README's primary target).
- N4. Background telemetry on update availability.

## 3. CONTEXT

`ModelDownloadService` already implements the canonical download pattern in
the repo:

- streams to `<target>.tmp`, atomic `File.Move` on success,
- reports progress via `IProgress<Progress>`,
- reuses the named `"models"` HttpClient from `Program.cs` with retry,
  timeout, circuit-breaker (`AddStandardResilienceHandler`),
- SHA-256 verification helper is already available.

`ModelCatalog.cs` plus the `models-bundle-v1` release catalog demonstrate
the "pinned URL + sha256 + on-disk catalog" pattern. Reusing these primitives
keeps the new surface small.

## 4. DECISION

### 4.1 On-demand download, not bundled

First-run install downloads a version-pinned binary from the project's
GitHub Releases (Mozgoslav-owned release asset that mirrors upstream
OpenCode, so we can pin checksums without trusting a third-party CDN
surprising us).

Rationale:

- Bundling adds 60–150 MB to the DMG for a feature not every user wants. A
  local-first app should not pay that cost by default.
- On-demand mirrors how Whisper/VAD models are handled today (ADR-011
  pattern). Keeps one provisioning mental model.
- Pinned GitHub release + sha256 keeps supply chain checkable and auditable.

Install is explicit: the user clicks **Install** on the OpenCode tab's
empty-state card (`POST /api/opencode/install`). No silent background
download.

### 4.2 Release catalog

`backend/src/Mozgoslav.Infrastructure/Resources/OpencodeCatalog.json` ships
with the backend, embedded as a resource (mirror of `ModelCatalog.cs`):

```json
{
  "schemaVersion": 1,
  "pinnedVersion": "X.Y.Z",
  "releases": [
    {
      "version": "X.Y.Z",
      "url": "https://github.com/AlexShchuka/mozgoslav/releases/download/opencode-X.Y.Z/opencode-macos-arm64.tar.gz",
      "sha256": "<hex>",
      "archive": "tar.gz",
      "entryPath": "opencode"
    }
  ]
}
```

Catalog is read-only at runtime. Changing the pinned version is a normal PR
(same workflow as model catalog bumps).

### 4.3 Install flow

Implemented in `Mozgoslav.Infrastructure/Services/OpencodeInstaller.cs`
registered as a singleton.

Steps:

1. Resolve entry from `OpencodeCatalog` (pinned or requested version).
2. Use `ModelDownloadService.DownloadAsync` (or a thin `FileDownloader` lifted
   from it if we decide to split) to stream to
   `~/Library/Application Support/mozgoslav/opencode/staging/opencode-<ver>.tar.gz.tmp`.
3. Verify sha256 — mismatch aborts and deletes the staging file.
4. Extract into `.../opencode/staging/<ver>/` (native `System.Formats.Tar` +
   `System.IO.Compression`).
5. Atomically replace the active binary:
   - previous active binary (if any) → `.../opencode/bin/opencode.previous`
   - staged binary → `.../opencode/bin/opencode`
   - update `.../opencode/bin/opencode.version` with `{ version, sha256,
     installedAt }`.
6. `chmod 0755` the binary (`System.IO.File.SetUnixFileMode`).
7. On macOS: apply `xattr -d com.apple.quarantine` via `xattr` shell call —
   the app is signed, but downloaded assets carry the quarantine flag that
   would block `spawn`. Wrap in `IPlatformShell` abstraction for testability.
8. Publish `InstallUpdated` event on `IOpencodeProcessStatusNotifier` so the
   SSE stream from ADR-020 notifies the renderer.

Progress is reported via the same `IProgress<DownloadProgress>` shape as the
model downloader. UI reuses the existing `ProgressBar` primitive.

### 4.4 Update flow

`POST /api/opencode/update` — identical to install, but:

- Running process is stopped first (renderer handles UX, main process kills
  the PTY, backend publishes `stopped`).
- Previous binary kept at `opencode.previous` for one-click rollback.

`POST /api/opencode/rollback` (optional for v1 — may land in a follow-up):
swap `opencode` ↔ `opencode.previous`, update `.version`.

### 4.5 Health check

`GET /api/opencode/status` (ADR-020) runs:

1. File existence check on `bin/opencode`.
2. `opencode --version` (short-timeout `Process.Start`) — records the version
   string. Non-zero exit or timeout ⇒ `healthy: false`, `lastError` set.
3. Returns cached result for 30 s to avoid thrashing on status polls.

### 4.6 Secrets and user data

The binary carries none. API keys come from SQLite settings at runtime via
the generated config file (ADR-023), not from env burned into the install.

## 5. ALTERNATIVES CONSIDERED

- **Bundle in the DMG.** Rejected (see §4.1). Acceptable to revisit if we
  ever ship an "OpenCode-first" variant of Mozgoslav.
- **Use system `opencode` in `$PATH`.** Simpler, but gives us no version
  guarantee and drags in the user's unsigned install with unknown agents /
  MCP configs. Deferred to ADR-014 as an advanced override.
- **Use `brew install` under the hood.** Adds a hard dep on Homebrew, breaks
  the hermetic install story the README promises.
- **No sha256 pin, trust upstream release URL.** Rejected. The README
  explicitly lists sha256-checked downloads as part of the privacy posture.

## 6. CONSEQUENCES

- GitHub Releases now carry OpenCode asset mirrors. Bumping OpenCode means:
  download upstream → compute sha256 → upload as release asset → PR the
  catalog bump.
- Disk footprint under `~/Library/Application Support/mozgoslav/opencode/`
  can reach ~300 MB (staging + active + previous). Acceptable; mirrors model
  downloads.
- Extra integration test surface: `OpencodeInstallerTests` spins a local HTTP
  fixture (existing `TestDatabase` / `ApiFactory` patterns can co-host a
  Kestrel fixture if needed — or we stub `IHttpClientFactory`).
- Catalog schema and the opencode/version format become a compatibility
  surface. Schema version is explicit (`schemaVersion: 1`) so future bumps
  can be detected.

## 7. OPEN QUESTIONS

- **OQ-1.** Do we keep `opencode.previous` indefinitely, or prune after N
  updates? Default: keep one previous, overwrite on next update.
- **OQ-2.** Is `xattr -d com.apple.quarantine` enough, or do we need to
  re-sign the extracted binary? Depends on whether upstream asset is already
  signed. Defer to prototype; assume quarantine removal is sufficient for
  v1 and treat re-signing as a separate ADR if it fails.
