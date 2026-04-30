---
adr: EF-002
title: Dev-mode sidecar launch-script resolution via repo-root sentinel
status: Accepted
date: 2026-04-28
related: [ADR-019-obsidian-optional-sidecar]
authors: [shuka]
---

# ADR-EF-002 — Dev-mode sidecar launch-script resolution

## Status

Accepted, 2026-04-28.

## Context

Three Electron-managed loopback services ship with bash launch scripts:

| Service | Script |
|---|---|
| Python ML sidecar | `python-sidecar/launch.sh` |
| SearXNG aggregator | `searxng-sidecar/launch.sh` |
| Syncthing supervisor | `frontend/resources/syncthing/<platform>/syncthing` |

In a packaged build the launchers receive an Electron `resourcesPath`
(the `app.asar.unpacked/...` tree) and the lookup is unambiguous. In a
development run (`npm run dev`) Electron is launched from the
`frontend/` directory, so `process.cwd()` is `<repo>/frontend` and there
is no `resourcesPath` that contains the sidecars. The historical
launcher candidates (`<resourcesRoot>/<sidecar>/launch.sh` and
`<cwd>/<sidecar>/launch.sh`) therefore both miss in dev — resulting in
silent `launch.sh not found. <Sidecar> disabled.` log lines and a broken
`npm run dev` experience for new contributors.

The Python sidecar additionally lacked a launch script of any kind; the
project shipped only `searxng-sidecar/launch.sh` while expecting parity.

A repo-root locator already exists conceptually in `agent-gate.sh`
(climb from the script directory). The same idea fits here: a directory
is the repo root if it contains both `python-sidecar/` and a
`frontend/package.json` whose `name` matches the frontend package
(`mozgoslav`). This is structural — no new file, no new metadata, no
runtime configuration store.

## Decision

1. Add a pure module `frontend/electron/utils/repoRoot.ts` exporting
   `resolveRepoRoot({ dirname, cwd, env })`. The function is parameterized
   (no internal `process.cwd()` reads) and returns the first ancestor of
   `dirname` (and then `cwd`) that satisfies the sentinel:

   * directory `<candidate>/python-sidecar/` exists, AND
   * file `<candidate>/frontend/package.json` exists, AND
   * the parsed JSON has `name === "mozgoslav"`.

   The environment variable `MOZGOSLAV_REPO_ROOT` is honored first when
   it points at an existing directory — escape hatch for non-standard
   layouts (worktrees, vendored copies).

2. Prepend the repo-root candidate (when found) to the launch-script /
   binary search arrays in `pythonSidecarSpec.ts`, `searxngLauncher.ts`,
   and `syncthingLauncher.ts`. Existing fallbacks remain in place so
   packaged builds and DMG bundles keep their current behaviour.

3. Ship `python-sidecar/launch.sh` to give the Python sidecar parity
   with `searxng-sidecar/launch.sh`: idempotent `.venv` bootstrap,
   `pip install -r requirements.txt`, `exec uvicorn app.main:app
   --host 127.0.0.1 --port 5060`. No `--reload` — the script is the
   production-flavoured entry point, used by both Electron in dev and
   the bundled DMG launcher.

4. Document the dev quick-start in `frontend/CLAUDE.md` and call out
   `bash launch.sh` as the canonical entry point in
   `python-sidecar/CLAUDE.md`.

## Consequences

* `npm run dev` finds all three launchers without any per-machine
  configuration. The path is identical for everyone who clones the
  repo into any directory.
* The escape hatch (`MOZGOSLAV_REPO_ROOT`) keeps the resolver useful
  in worktrees and CI containers that mount the repo at a non-standard
  location.
* `resolveRepoRoot` is pure and parameterized — fully unit-testable
  without `jest.mock` of `node:fs`. Tests live in
  `frontend/__tests__/electron/repoRoot.test.ts`.
* The sentinel is structural: renaming `frontend/` or moving
  `python-sidecar/` would break it. Both moves would also break
  half the build, so the coupling is acceptable and self-flagging.

## Alternatives rejected

| Option | Reason |
|---|---|
| Hardcoded `path.join(__dirname, "..", "..", "..")` walk | Brittle to file moves; needs constant maintenance per call-site; not testable as a unit. |
| Use npm `prefix` env or `INIT_CWD` | Set only by the npm CLI; absent when Electron spawns from its own loader, and invisible in a packaged DMG. |
| Bundle the sidecars into a dev `app.asar.unpacked` tree | Doubles dev iteration cost (rebuild on every script edit) for a problem that does not exist in packaged builds. |
| Walk up looking for `.git/` only | Multiple worktrees and submodules muddy this; doesn't catch a deliberately stripped checkout used by some CI containers. |
