---
id: api-domain-types-not-from-api-clients
status: proposed
audience: agent
---

# api-domain-types-not-from-api-clients

## context
Feature components import domain shapes (e.g. `VaultDiagnosticsReport`) from per-domain API client classes in `src/api/`. When the transport changes, every consumer breaks because the type lives on the client.

## problem
- During the REST→GraphQL migration, 9 frontend files imported obsidian-domain types (`VaultDiagnosticsReport`, `ObsidianReinstallResult`, `ObsidianReapplyResult`, `ObsidianBulkExportError`, `CheckSeverity`) from the soon-to-be-deleted `ObsidianApi.ts`.
- Cutover required either retaining the client file as a type-only stub or relocating types — both are friction.
- The same anti-pattern likely repeats for recordings, jobs, notes, settings — anywhere a domain entity surfaces in components and the «easy» import is the API client.

## proposal
- Single source of truth for every domain shape: `src/domain/<Name>.ts`.
- API clients (REST or gql) import from `src/domain/`, never the reverse.
- gql-codegen output (`src/api/gql/`) is allowed as the source for raw transport DTOs, but consumer-visible types live under `src/domain/` and may delegate via `type Foo = ResultOf<typeof FooFragmentDoc>`-style aliases.
- Lint rule (no-restricted-imports) enforces «no `from "../api/[A-Z][a-zA-Z]*Api"` for type-only imports» across `src/features/**`, `src/store/**`, `src/components/**`.

## acceptance
- [ ] grep `from "../api/[A-Z][a-zA-Z]*Api"` over the consumer trees returns zero hits.
- [ ] Every domain referenced in components has a matching `src/domain/<Name>.ts`.
- [ ] Lint rule lands and CI catches a deliberate violation in a synthetic PR.
- [ ] CLAUDE.md documents the convention.

## rejected
| alt | reason |
|---|---|
| Re-export types through `src/api/index.ts` | hides the dependency; same fragility under transport change. |
| Generate domain types directly from gql codegen | tight coupling between presentation types and wire types; breaks every schema tweak. |
| Allow cross-imports in «infrastructure» files only | adds a category nobody enforces. |
