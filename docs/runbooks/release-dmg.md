# Runbook — cutting a macOS `.dmg` release

Trigger, current state, and the unlock-signing checklist for later.

## Trigger

```bash
git checkout main && git pull
git tag -a v0.X.Y -m "v0.X.Y"
MOZGOSLAV_HUMAN_PUSH=1 git push origin v0.X.Y
```

`.github/workflows/release.yml` fires on any `v*.*.*` tag (and on `workflow_dispatch`). Runner: `macos-latest`. Output: `Mozgoslav-<tag>-arm64.dmg` attached to the GitHub Release for the tag.

## What the workflow does today

1. Checkout + setup-dotnet 10 + setup-node 24.
2. `bash scripts/fetch-bundle-models.sh` — Tier-1 Whisper / VAD / dictation models into `frontend/build/bundle-models/`. Skips silently if `manifest.json` has no pinned `release_tag`.
3. `cd frontend && npm ci`.
4. `cd frontend && npm run dist:mac` — this chains:
   - `bash ../scripts/fetch-bundle-models.sh`
   - `bash ../scripts/publish-backend-osx.sh` → `dotnet publish -r osx-arm64 --self-contained -p:PublishSingleFile=true -o frontend/resources/backend/`
   - `npm run build` (vite + tsc)
   - `npm run build:helper:mac` (`swift build -c release` for the dictation helper)
   - `electron-builder --mac` — bundles the backend, helper, syncthing, and models into `.dmg` via the `extraResources` wiring in `frontend/electron-builder.yml`.
5. Uploads the `.dmg` as a workflow artefact.
6. On tag push (`refs/tags/v*`), attaches the `.dmg` to the GitHub Release via `softprops/action-gh-release@v2`.

## Current limitations

- **Unsigned + un-notarised.** First launch on a fresh mac shows a Gatekeeper warning. `electron-builder.yml` has `hardenedRuntime: false` and no signing block.
- **arm64-only.** `target: dmg / arch: [arm64]`. Intel machines and the `darwin-amd64` syncthing path exist in `extraResources` only for cross-arch dev iteration; the produced `.dmg` does not run on Intel.
- **Python sidecar is not bundled.** By design — privacy posture. Sidecar stays optional and user-installable.

## Unlocking signing + notarisation

Drop these into GitHub Secrets on the `AlexShchuka/mozgoslav` repo:

| Secret | Source | Notes |
|---|---|---|
| `MAC_CERT_P12_BASE64` | `security export -k login.keychain -t identities -f pkcs12 -o cert.p12` then `base64 -i cert.p12` | Developer ID Application cert |
| `MAC_CERT_PASSWORD` | password used on the `.p12` export | |
| `KEYCHAIN_PASSWORD` | any random string | temporary keychain password on the runner |
| `APPLE_API_KEY_BASE64` | App Store Connect → Keys → Generate → download `.p8` → `base64 -i AuthKey_XXXX.p8` | modern notarytool path |
| `APPLE_API_KEY_ID` | key id from App Store Connect | |
| `APPLE_API_ISSUER_ID` | issuer id from App Store Connect | |

Then:

1. Flip `hardenedRuntime: true` in `frontend/electron-builder.yml` and add a `mac.notarize: { teamId: <TEAM_ID> }` block (or rely on env-driven `APPLE_API_KEY` / `APPLE_API_KEY_ID` / `APPLE_API_ISSUER` environment variables on the build step).
2. Review `build/entitlements.mac.plist` — keep `com.apple.security.cs.allow-jit` only if Whisper.Net or the realtime path needs it.
3. Add a step to `release.yml` before `npm run dist:mac` that decodes `MAC_CERT_P12_BASE64` into a temp `.p12`, creates a temporary keychain, imports the cert, and exports `CSC_LINK` + `CSC_KEY_PASSWORD`. Add a cleanup step in `if: always()`.
4. Test on a fresh mac that has never opened the app: the `.dmg` must open without Gatekeeper warning, the app must launch, microphone + accessibility + recording + dictation flows must pass end-to-end.

## Failure playbook

- `fetch-bundle-models.sh` exits 0 without downloads → `manifest.json`'s `release_tag` is empty. `.dmg` still builds; it just ships without pre-bundled models and the Models page will prompt to download at first run.
- `publish-backend-osx.sh` fails with missing `Mozgoslav.Api` binary → the `dotnet publish` step didn't produce a single-file exe. Usually a package-version drift. Re-run `dotnet restore` with `-maxcpucount:1` and check the bottom of the publish log for `NU1*` errors.
- `electron-builder` complains about missing files in `extraResources` → one of the `from:` paths (syncthing binaries, dictation helper, backend bundle) is empty. Check which script should have populated it.
- Release step reports `fail_on_unmatched_files: true` and no `.dmg` → build stage silently produced no artefact. Scroll up; `electron-builder` errors are hundreds of lines above the upload step.
