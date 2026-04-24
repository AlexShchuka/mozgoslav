# Mozgoslav — agent operating manual

Contract between this repo and any coding agent. Only things you cannot infer from a `ls` / `grep` / `package.json` read. Architecture, file tree, and generic conventions live in the code.

## Boundaries

**Never do:**

- Push to any remote. The `pre-push` lefthook refuses unless `MOZGOSLAV_HUMAN_PUSH=1` is set by a human.
- Bump package versions, introduce backwards-compat shims, add telemetry, enable auto-update, or add crash reporters. Renovate owns dependency updates.
- Open outbound network calls from the app to anything other than the LLM / Obsidian / Sidecar endpoints the user configured in `settings`.
- Put secrets in env vars or logs. Secrets live in the SQLite `settings` store and render through `<Input sensitive />`.
- Edit anything already inside `.archive/`. It is write-only scrap.
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
# Full local gate before committing (matches CI):
bash scripts/check-encoding.sh
uncomment --dry-run --remove-todo --remove-fixme --remove-doc \
  backend frontend/src frontend/electron python-sidecar native scripts

# Backend integration + unit suites use separate runsettings:
dotnet test backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj \
  --settings backend/UnitTests.runsettings -maxcpucount:1
dotnet test backend/tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj \
  --settings backend/IntegrationTests.runsettings -maxcpucount:1

# Scoped test while iterating:
dotnet test --filter "FullyQualifiedName~<Class>" -maxcpucount:1

# Translations parity (en.json ↔ ru.json) — CI blocks on drift:
cd frontend && npm run check-translations

# macOS .dmg pipeline (bundled backend + models + native helper + syncthing):
bash scripts/publish-backend-osx.sh
cd frontend && npm run dist:mac

# Codegen-driven GraphQL types (regenerates src/api/gql/):
cd frontend && npm run codegen
```

Everything else (`npm run dev/build/test/lint/typecheck`, `dotnet build/format`, `pytest`, `ruff`, `swift build/test`) is discoverable from `package.json` / `.csproj` / `pyproject.toml` / `Package.swift`.

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
