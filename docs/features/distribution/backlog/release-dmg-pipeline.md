---
id: distribution-release-dmg-pipeline
status: proposed
audience: agent
---

# distribution-release-dmg-pipeline

## goal
- One signed + notarized `.dmg` artefact published per merge to `main` that passes all checks.
- Self-contained: backend, native helpers, models, syncthing bundled. No runtime install required on user machine.
- Local `npm run dist:mac` script preserved for dev iteration on a mac host.

## non-goals
- Windows or Linux distribution.
- Auto-update channel.
- Public web download page.
- App Store submission.

## current state (audit)
- `frontend/package.json` has `dist:mac` script: fetch models → vite build → swift build helper → `electron-builder --mac`.
- `frontend/electron-builder.yml` bundles whisper models, dictation helper, syncthing binaries, icon. **Backend is missing from `extraResources`** — user needs `.NET 10` runtime installed for the app to start.
- No CI workflow for releases.
- No code-signing or notarization wired.
- Swift helper requires macOS toolchain — cannot cross-build from Linux.

## architecture (proposed)
- macOS GitHub Actions runner (`macos-latest` or pinned `macos-15`) is the only place a full `.dmg` can be produced — Swift `AppKit/CoreAudio` does not cross-compile from Linux.
- Pipeline stages, ordered:
  - lint + typecheck + tests (existing CI already covers these on every PR).
  - `dotnet publish -c Release -r osx-arm64 --self-contained -p:PublishSingleFile=true` → output to `frontend/resources/backend/`.
  - `npm ci` + `swift build -c release` (helper) + vite build (renderer) + electron-builder mac dmg.
  - sign + notarize via `electron-builder` built-in flow.
  - upload artefact to GitHub Releases.
- Trigger: `push` to `main` after required checks pass; OR a `release: published` event for a version tag (more controlled).

## stack (open decisions)
- [ ] runner — `macos-latest` (rolling) vs pinned major (`macos-15`) for reproducibility.
- [ ] release trigger — every `main` merge vs version-tag-only.
- [ ] artefact host — GitHub Releases vs S3-equivalent.
- [ ] signing — Apple Developer ID (Developer ID Application) cert, exported as `.p12`, base64-stored in secrets. App Store cert is out of scope.
- [ ] notarize transport — `notarytool` (Xcode 13+) using App Store Connect API key (`.p8`) vs Apple ID + app-specific password. API key is the modern path.
- [ ] auto-update — left out; revisit in follow-up backlog when needed.

## required GitHub secrets
- `MAC_CERT_P12_BASE64` — Developer ID Application cert exported as `.p12`, then `base64 -i cert.p12 -o encoded.txt`.
- `MAC_CERT_PASSWORD` — `.p12` import password.
- `KEYCHAIN_PASSWORD` — random string used by the runner-side keychain creation step.
- `APPLE_API_KEY_BASE64` — App Store Connect API key (`.p8`), base64-encoded.
- `APPLE_API_KEY_ID` — key id from App Store Connect.
- `APPLE_API_ISSUER_ID` — issuer id from App Store Connect.
- (Alternative for notarize) `APPLE_ID` + `APPLE_ID_APP_PASSWORD` + `APPLE_TEAM_ID` if API key is not used.

Naming should match what `electron-builder` reads (`CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`) — set those as env vars on the build step from the secrets above.

## stages

### stage 0 — bundle backend into the .dmg (prereq, mac or linux)
- [ ] add `dotnet publish` step to `dist:mac` script and a new shared script invoked from CI.
- [ ] place output at `frontend/resources/backend/`.
- [ ] add `extraResources` entry in `electron-builder.yml` mapping `resources/backend` → `backend`.
- [ ] update electron supervisor (`electron/main.ts` subprocess spawn) to resolve backend path via `process.resourcesPath` in production and a dev-relative path in development.
- [ ] verify launch on a mac without `.NET` runtime installed.
- [ ] keep the local `dist:mac` script working (calls the same shared step).

### stage 1 — CI workflow
- [ ] add `.github/workflows/release-mac.yml`.
- [ ] runner: `macos-latest` (decision still open).
- [ ] trigger: `workflow_run` on the existing CI workflow with `branches: [main]` and `conclusion: success`.
- [ ] checkout, set up Node, set up .NET 10 SDK, set up Xcode (for Swift), run `npm ci` + `dotnet restore`.
- [ ] reuse the lint/typecheck/test invocations the project already has — do not duplicate.
- [ ] run the bundle-backend step from stage 0.
- [ ] run electron-builder via `npm run dist:mac`.

### stage 2 — keychain + signing setup
- [ ] decode `MAC_CERT_P12_BASE64` to a temp `.p12`.
- [ ] create a temporary keychain on the runner; import the cert; unlock; mark as default.
- [ ] export `CSC_LINK` (path to `.p12`) and `CSC_KEY_PASSWORD` for `electron-builder`.
- [ ] cleanup keychain in `if: always()` step.

### stage 3 — notarize
- [ ] decode `APPLE_API_KEY_BASE64` to a temp `.p8` and place under a stable path.
- [ ] export `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` for `electron-builder` (built-in notarize via `notarytool`).
- [ ] in `electron-builder.yml mac.notarize`: enable `{ teamId: <TEAM_ID> }` (or rely on env-driven config). `hardenedRuntime: true` is required for notarize — current config has it `false`, must flip with the entitlements review.
- [ ] entitlements file (`build/entitlements.mac.plist`) — review microphone + accessibility usage, keep `com.apple.security.cs.allow-jit` only if Whisper.NET / WhisperRealtime needs it.

### stage 4 — release artefact
- [ ] upload `release/*.dmg` to a GitHub Release named after the package version.
- [ ] decision: tag-driven release vs auto-version-bump on every main merge.
- [ ] keep release notes manual; no auto-changelog in v1.

### stage 5 — local dev parity
- [ ] document a stripped-down `npm run dist:mac:local` that skips signing + notarize (env-gated by absence of `CSC_LINK`).
- [ ] document the Mac-toolchain requirement for the swift helper; remove the script from the Linux pod's allowed surface.

## acceptance
- [ ] every merge to `main` after a green required-checks run produces a signed + notarized `.dmg` attached to a GitHub Release.
- [ ] the produced `.dmg` opens on a fresh mac without Gatekeeper warning, with no `.NET` runtime installed.
- [ ] microphone, accessibility, push-to-talk, dictation push, and recording flows work end-to-end on the installed app.
- [ ] `npm run dist:mac` (local, signed if cert is present, unsigned otherwise) still builds an opening `.dmg` on a mac dev box.
- [ ] CI workflow file is the only place secrets are read; no secret strings appear in repo files.

## rejected
| alt | reason |
|---|---|
| Cross-build .dmg from a Linux runner | swift helper needs macOS / Xcode toolchain — not possible without the proprietary frameworks. |
| `Electron.NET` framework | already on hand-rolled supervisor + ASP.NET Minimal API; rewriting on a wrapper is out of scope. |
| Apple ID + app-specific password for notarize | `notarytool` API key path is the modern, scriptable alternative — fewer interactive failure modes. |
| Skip notarize, ship unsigned | Gatekeeper warning on every fresh install; quarantine flag stays on. |
| Auto-update channel in v1 | extra surface; defer until distribution is live. |

## open
- [ ] confirm runner pin (`macos-latest` vs `macos-15`).
- [ ] confirm release trigger model (post-`main`-merge auto vs tag-driven).
- [ ] confirm `hardenedRuntime: true` does not break Whisper.NET / VAD / Swift helper at runtime — needs verification on a signed build.
- [ ] decide whether to bundle universal (`arm64 + x64`) or arm64-only — current config is arm64-only; flipping needs the .NET publish + syncthing path matrix.
- [ ] python sidecar bundling — currently optional; left out of v1 distribution per the privacy posture (no bundled service started by default).

## references
- electron-builder mac signing + notarize via API key: <https://www.electron.build/configuration.html>
- BigBinary walkthrough on signing + notarize: <https://www.bigbinary.com/blog/code-sign-notorize-mac-desktop-app>
- Simon Willison TIL on signing in GitHub Actions: <https://til.simonwillison.net/electron/sign-notarize-electron-macos>
- `extraResources` per platform / arch: <https://github.com/electron-userland/electron-builder/issues/7891>
