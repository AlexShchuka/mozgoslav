---
id: opencode-provisioning
status: proposed
---

# opencode-provisioning

## goal
Provide the `opencode` binary on demand with version pin and integrity check.

## non-goals
- Auto-update on launch (explicit API action only).
- `$PATH` fallback to any externally installed `opencode` (deferred).
- Non-macOS platforms.

## decision
- On-demand download from Mozgoslav-owned GitHub Release asset.
- sha256 pin in an embedded release catalog (schema-versioned).
- Install into the app-data dir under `opencode/bin/`.
- Keep exactly one previous binary for rollback; overwrite on next update.
- Reuse existing download + atomic-write + sha256 primitives (no new plumbing).
- Remove macOS quarantine xattr on the extracted binary before first spawn.

## flow
```
install:   download → sha256 verify → extract → swap active/previous → chmod 0755 → clear quarantine → publish event
update:    stop process → install-flow → previous binary retained
rollback:  swap active ↔ previous
health:    file exists? && `opencode --version` within timeout; cache 30 s
```

## catalog shape
```
{ schemaVersion, pinnedVersion, releases: [{ version, url, sha256, archive, entryPath }] }
```

## rejected
| alt | reason |
|---|---|
| Bundle in the DMG | +60–150 MB for an optional feature |
| Use system `opencode` | unknown version, unknown config, no integrity guarantee |
| brew under the hood | hard dep on Homebrew, breaks hermetic install |
| Skip sha256 pin | violates existing download-integrity posture |

## open
- Re-signing vs quarantine removal — decide after first prototype attempt.
