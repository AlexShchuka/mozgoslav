# Mozgoslav — agent operating manual

Contract between this repo and any coding agent. Only things you cannot infer from a `ls` / `grep` / `package.json` read. Architecture, file tree, and generic conventions live in the code.

## Boundaries

**Never do:**

- Bump package versions, introduce backwards-compat shims, add telemetry, enable auto-update, or add crash reporters. Renovate owns dependency updates.
- Open outbound network calls from the app to anything other than: configured LLM endpoint, configured Obsidian endpoint, loopback sidecars (`python-sidecar`, `searxng-sidecar`), and web-fetch URLs that originated from the local SearXNG aggregator. Anything else is denied.
- Put secrets in env vars or logs. Secrets live in the SQLite `settings` store and render through `<Input sensitive />`.
- Use `--no-verify`, `--force`, `--amend` on pushed commits, `git reset --hard`, or any other destructive git without explicit user approval.

**Ask first:**

- Schema change on `Mozgoslav.Domain` entities (drops the local `mozgoslav.db` on every dev machine — `EnsureCreatedAsync`, not a migration tool).
- Any dependency on a new npm / NuGet / PyPI package.
- Any change to `.github/workflows/*`, `lefthook.yml`, `renovate.json`, or `electron-builder.yml`.
- Any cross-stack contract change (GraphQL schema drop, IPC shape, native Swift signature).

**Always do:**

- Open new backlog / bugs / shipped decisions as **GitHub Issues** via `.github/ISSUE_TEMPLATE/*.yml`. Labels: `feature/<name>` + `type/{backlog|bug|decision}` + optional `status/*`.
- Branch as `<username>/<kebab-slug>` off `main`.
- Squash-merge only. The PR title is the commit message and is linted against `@commitlint/config-conventional` (header ≤ 100, types: `feat fix docs style refactor perf test build ci chore`, `!` for breaking).
- When stuck on a flaky test: open a `type/bug` Issue with `flaky-test` in the title. Do not retry-until-green.

## Do-not-do catalogue (bans with concrete shape)

- `class Foo(IBar bar)` — primary constructors banned; use `readonly` fields + traditional ctor.
- `// comment`, `/* */`, XML `///` summaries, `TODO`, `FIXME`, `HACK` — all banned. CI runs `uncomment --dry-run` and fails on drift. Rename instead of annotating; open a backlog Issue instead of `TODO`.
- `style={{ color: 'red' }}` — inline JSX style banned.
- CSS modules, Tailwind, bare `.css` imports under `src/` — banned. Only `styled-components`.
- React class components — banned. Function components + hooks.
- Bare `fetch` / `axios` inside a component — banned. Go through `src/api/graphqlClient` or a per-domain saga.
- `await rawPromise.then(…)` inside a saga — banned. Use `call / race / take`.
- `#region` in C# — banned; signals a file that should be split.
- Magic colour literals in `.style.ts` (`rgb(…)`, `#abcdef`) — banned. Add a token in `frontend/src/styles/theme.ts`.
- Hand-written frontend feature scaffolds — banned. Run `npm run plop`.

## Non-obvious commands

```bash
# Full local gate — matches CI; use before every push:
bash scripts/agent-gate.sh                 # all stacks
bash scripts/agent-gate.sh backend         # scoped: verify|backend|frontend|python|native

# Scoped test while iterating (bypasses runsettings for speed):
dotnet test --filter "FullyQualifiedName~<Class>" -maxcpucount:1

# macOS .dmg pipeline (bundled backend + models + native helper + syncthing):
bash scripts/publish-backend-osx.sh
cd frontend && npm run dist:mac

# Regenerate GraphQL typed ops after adding a .graphql operation:
cd frontend && npm run codegen
```

Everything else (`npm run dev/build/test/lint/typecheck`, `dotnet build/format`, `pytest`, `ruff`, `swift build/test`) is discoverable from `package.json` / `.csproj` / `pyproject.toml` / `Package.swift`.

## Runbooks

- `docs/runbooks/agent-session.md` — end-to-end flow for an AI coding session in this repo.
- `docs/runbooks/release-dmg.md` — cutting a macOS release + unlock-signing checklist.
- `docs/runbooks/backlog-migration.md` — one-shot docs/ → Issues migration; for re-imports.

## Testing discipline

- Every PR ships the matching test. Bug fix = regression test that fails before, passes after.
- `Mozgoslav.Tests.Integration` spins real SQLite temp files via `IntegrationTestsBase.Factory`. Do not mock EF Core.
- `Mozgoslav.Tests.Schema` snapshots the GraphQL SDL via Snapshooter. Schema changes require a deliberate snapshot update, not blind approval.
- Frontend sagas use `redux-saga-test-plan`. Mock `graphqlClient`, not fetch / WebSocket primitives.
- Coverage floor: 1% line rate per cobertura report, enforced by CI. Don't ship below.

## Non-obvious patterns (pointers, not prose)

| Concern | Reference file to copy |
|---|---|
| Redux slice (actions/reducer/mutations/selectors/saga) | `frontend/src/store/slices/recording/` |
| Feature folder (container + presentational + tests) | `frontend/src/features/RecordingList/` |
| Shared UI primitive | `frontend/src/components/Button/` |
| Theme token usage | `frontend/src/components/Badge/Badge.style.ts` |
| Electron subprocess supervisor | `frontend/electron/utils/backendLauncher.ts` |
| GraphQL query extension (HotChocolate code-first) | `backend/src/Mozgoslav.Api/GraphQL/Health/HealthQueryType.cs` |
| GraphQL mutation with `UserError` payload | `backend/src/Mozgoslav.Api/GraphQL/Settings/SettingsMutationType.cs` |
| Application-layer use case | `backend/src/Mozgoslav.Application/UseCases/ReprocessUseCase.cs` |
| Integration test with real SQLite | `backend/tests/Mozgoslav.Tests.Integration/` |

## Jargon

- **Mozgoslav.Domain / Application / Infrastructure / Api** — Clean Architecture rings; `Domain` has zero deps, `Api` is the DI composition root.
- **AppPaths** — `~/Library/Application Support/Mozgoslav/` layout (db, logs, models, backups).
- **MozgoslavMetrics** — `System.Diagnostics.Metrics` meter exposed at `GET /metrics` (Prometheus, loopback only).
- **ApiFactory** — `WebApplicationFactory<Program>` subclass; canonical bootstrapper for integration tests.
- **recording slice** — Redux-Saga slice chosen as the reference; copy its structure for new slices.
