# Block 7 — DMG packaging + release workflow

- **Block owner:** developer agent (writes config, workflow, scripts) + shuka (validates DMG on Mac).
- **Mac validation required:** **yes** — DMG installs and runs only on macOS.
- **Depends on:** Blocks 2, 3, 4, 5, 6 (everything shipped inside DMG) + ADR-010 (bundled models).
- **Unblocks:** Block 8 (final cleanup once DMG is known good).

---

## 1. Context

Today, `frontend/package.json` has a `dist:mac` script that chains
`npm run build && npm run build:helper:mac && electron-builder --mac`. Known gaps:

- **No icon:** `frontend/electron-builder.yml` references `build/icon.icns`; the file does not exist in the repo.
  Electron-builder will fail or ship a default icon placeholder.
- **Duplicate config:** `frontend/electron-builder.yml` AND `frontend/package.json` → `build` section both exist. One
  will win, the other is dead config. Risk of drift.
- **No bundle fetch:** ADR-010 requires bundle models fetched into `frontend/build/bundle-models/` and added as
  `extraResources`. The script does not exist.
- **Never actually built:** Per `TODO.md` and `SELF-REVIEW.md`, `dist:mac` was never successfully run.
- **No release workflow:** No GitHub Actions job produces a DMG artefact on tag or manual dispatch.
- **No signing:** The produced DMG will not be signed. macOS Gatekeeper will flag it on first run.

## 2. Target state

### 2.1 Single electron-builder config

Keep `frontend/electron-builder.yml` as the single source of truth. Remove the duplicated `build` section from
`package.json`. Rationale: YAML config is cleaner for multi-line resources/entitlements, already present and up-to-date.

### 2.2 Bundle fetch script

`scripts/fetch-bundle-models.sh` (new, repo root — mac/linux compatible) downloads models from
`https://github.com/AlexShchuka/mozgoslav/releases/download/models-bundle-v1/<file>` into
`frontend/build/bundle-models/`. Idempotent (skip if file exists and checksum matches). One entry per Tier 1 model (per
ADR-010 §2.2).

Manifest file `frontend/build/bundle-models.manifest.json` lists each bundled model with filename, size, sha256, release
tag. The script verifies checksums after download. Script fails loudly if any checksum mismatches.

### 2.3 Updated `dist:mac`

```json
"dist:mac": "scripts/fetch-bundle-models.sh && npm run build && npm run build:helper:mac && electron-builder --mac"
```

The fetch must run before `build` so electron-builder sees `extraResources` populated.

### 2.4 `electron-builder.yml` updates

- Add `extraResources` entries for `build/bundle-models/` contents (a single directory entry → copied as
  `Resources/bundle-models/` inside the `.app`).
- Add `build/icon.icns` — generated once from a source PNG via `iconutil`.
- Ensure `hardenedRuntime: false` remains false only while we are unsigned; when we add signing, flip to `true` with
  entitlements.
- Add the helper binary as extraResources (already present: `mozgoslav-dictation-helper`). Confirm path after Block 3's
  Swift package extension.
- Add an `afterSign` hook stub (empty for now) — ready for notarisation in Phase 2.

### 2.5 Icon

Source: one 1024×1024 PNG `frontend/build/icon-source.png` (committed to repo). Build step: `iconutil -c icns <iconset>`
invoked from `scripts/build-icon.sh`. `icon.icns` is **not committed** — it is a generated artefact. Alternative: commit
`icon.icns` directly and skip the iconutil step — simpler but less reproducible. Default: commit the source PNG + icns
generated once, committed as binary. Easier for CI, fewer moving pieces.

### 2.6 Release workflow

New file `.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*.*.*']
  workflow_dispatch:

jobs:
  macos-dmg:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with: { dotnet-version: '10.0.x' }
      - uses: actions/setup-node@v4
        with: { node-version: '24', cache: npm, cache-dependency-path: frontend/package-lock.json }
      - name: Restore bundle models
        run: scripts/fetch-bundle-models.sh
      - name: Install helper deps (swift)
        run: swift --version  # macOS default
      - name: Build DMG
        run: cd frontend && npm ci && npm run dist:mac
      - name: Upload DMG artifact
        uses: actions/upload-artifact@v4
        with:
          name: mozgoslav-${{ github.ref_name }}-arm64.dmg
          path: frontend/release/*.dmg
      - name: Attach to release (on tag)
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: frontend/release/*.dmg
```

Concurrency: single-flight (cancel older runs on same tag). No secrets required for unsigned build.

### 2.7 Signing — deferred

v0.8 ships unsigned. README and Onboarding Ready step show a one-liner: "On first run, right-click the app and choose
Open — this skips Gatekeeper's unsigned warning. We'll add signing in a later version."

When shuka has an Apple Developer ID ($99/yr) and cert, Phase 2 adds:

- `APPLE_ID`, `APPLE_ID_PASSWORD`, `CSC_LINK`, `CSC_KEY_PASSWORD` as GitHub secrets.
- `hardenedRuntime: true`, entitlements.plist under `frontend/build/`, `afterSign` hook for notarisation via
  `electron-notarize`.
- `macos-dmg` job uses these secrets when present.

This is **scoped out of v0.8**, documented in `07-dmg-and-release.md` §8 so the Phase 2 PR has a clean starting point.

## 3. Tasks

1. Remove the duplicated `build` section from `frontend/package.json`. Keep `electron-builder.yml` only.
2. Add `frontend/build/icon-source.png` (1024×1024 Mozgoslav logo).
3. Add `scripts/build-icon.sh` to generate `icon.icns` from PNG (one-time / on-demand).
4. Generate `icon.icns` once, commit under `frontend/build/icon.icns`.
5. Add `scripts/fetch-bundle-models.sh` and `frontend/build/bundle-models.manifest.json`.
6. Create the GitHub Release `models-bundle-v1` with the Tier 1 model files (one-time, shuka action — see §6).
7. Update `electron-builder.yml` for `extraResources` and icon path.
8. Update `dist:mac` to chain the fetch script first.
9. Add `.github/workflows/release.yml`.
10. Update `README.md` with "installing the unsigned DMG" tip (right-click → Open).
11. Add a `GET /api/meta` endpoint returning `{ version, commit, buildDate }` from embedded resources — so the DMG
    validation can check "this is the right build" quickly.

## 4. Acceptance criteria

- `frontend/electron-builder.yml` is the single source of truth; `package.json` has no `build` key.
- `dist:mac` on shuka's Mac produces `frontend/release/Mozgoslav-<version>-arm64.dmg` without errors.
- The resulting `.app` under `/Volumes/<mount>/Mozgoslav.app/Contents/Resources/bundle-models/` contains the expected
  model files with matching checksums.
- Launching the app from the installed location completes the Onboarding without downloading anything (bundled models
  present).
- `.github/workflows/release.yml` runs to green on `workflow_dispatch` from main; artefact is downloadable.
- On push of a `v*.*.*` tag, the DMG is attached to the GitHub Release automatically.

## 5. Non-goals

- Signing and notarisation (Phase 2).
- Linux/Windows builds (Mozgoslav is macOS-first; other platforms are sandbox dev only).
- Auto-update (Sparkle/electron-updater) — out of v0.8 per CLAUDE.md "no auto-update checks".
- Dark DMG background / custom mount design beyond the icon.

## 6. shuka-side one-time actions

1. **Create GitHub Release `models-bundle-v1`** with the following assets attached:
    - `whisper-small-q5_0.bin` (~250 MB)
    - `ggml-silero-v6.2.0.bin` (~4 MB)
    - `silero_vad.onnx` (~2 MB)
    - `resemblyzer-state.pt` (~85 MB)
2. Note the release tag; update `scripts/fetch-bundle-models.sh` to pin to it (agent will parameterise the script with
   the tag so updating later is one-line).

This is a one-time shuka action. Subsequent releases do not re-upload the bundle.

## 7. Mac validation checklist (shuka)

1. `git pull` v0.8 branch.
2. `cd frontend && npm ci && npm run dist:mac`.
3. Expected: `frontend/release/Mozgoslav-0.1.0-arm64.dmg` appears (~350-400 MB).
4. Double-click DMG, drag Mozgoslav.app to Applications.
5. Launch — Gatekeeper shows warning. Right-click → Open. Confirm.
6. Complete Onboarding (Block 4). Expect zero downloads required.
7. Import a test audio → note lands in Obsidian.
8. Close app, relaunch, confirm it does not re-run Onboarding.
9. Report `block7-mac-validation-2026-04-YY.md`.

## 8. Phase 2 (out of v0.8) — signing migration

Document here so the Phase 2 PR is turn-key:

- Obtain Apple Developer ID certificate, export .p12 with password.
- Upload to GitHub Secrets: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `CSC_LINK` (base64 p12), `CSC_KEY_PASSWORD`.
- `electron-builder.yml`: `hardenedRuntime: true`, `gatekeeperAssess: true`,
  `entitlements: build/entitlements.mac.plist`, `entitlementsInherit: same`.
- Add `afterSign` hook: `scripts/notarize.js` invoking `electron-notarize` with env creds.
- `.github/workflows/release.yml`: pass secrets to the `dist:mac` step; change artefact name to `-arm64-signed.dmg`.

---

## 9. Checkpoint summary (Agent B + Resume Agent, 2026-04-17)

- Files added: `.github/workflows/release.yml` (macos-latest runner, on tag `v*.*.*` + workflow_dispatch, single-flight
  concurrency, attaches DMG to GitHub Release on tag), `scripts/fetch-bundle-models.sh` (idempotent; skips silently when
  `release_tag` empty so dev builds work), `scripts/build-icon.sh` (iconutil-based PNG → icns),
  `frontend/build/icon-source.TODO` (placeholder marker — shuka drops 1024×1024 PNG locally on Mac),
  `frontend/build/bundle-models.manifest.json` (Tier 1 file list with empty sha256 / release_tag fields ready to fill).
- `frontend/electron-builder.yml`: extraResources for `build/bundle-models/` + helper binary path; icon path set to
  `build/icon.icns`; `hardenedRuntime: false` (signing deferred); `afterSign` hook stub.
- `frontend/package.json`: duplicate `build` section removed; `dist:mac` chains
  `scripts/fetch-bundle-models.sh && npm run build && npm run build:helper:mac && electron-builder --mac`.
- `backend/src/Mozgoslav.Api/Endpoints/MetaEndpoints.cs` + `MapMetaEndpoints` registration: `GET /api/meta` returns
  `{ version, commit, buildDate }` from `AssemblyInformationalVersionAttribute` + entry-assembly metadata.
- `README.md`: added unsigned-DMG right-click → Open footnote next to the `dist:mac` snippet.
- Tests: meta endpoint covered in `MetaEndpointsTests` (200 + json shape).
- Deferred to shuka on Mac (per §6/§7): create GitHub Release `models-bundle-v1`, fill `release_tag` + checksums in
  manifest, drop `icon-source.png`, run `dist:mac` end-to-end.
- Deviations: none material — `icon.icns` cannot be generated in Linux sandbox, hence `icon-source.TODO` placeholder +
  `build-icon.sh` for shuka's one-off run.
