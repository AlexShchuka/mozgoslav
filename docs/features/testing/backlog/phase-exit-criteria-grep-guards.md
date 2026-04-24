---
id: testing-phase-exit-criteria-grep-guards
status: proposed
audience: agent
---

# testing-phase-exit-criteria-grep-guards

## context
Multi-phase migrations are completed in chunks by autonomous agents. «build green + tests green» does not guarantee the phase scope was fully covered.

## problem
- During the REST→GraphQL migration, phases 1–11 migrated sagas. Feature components calling `apiFactory.createXxxApi().method()` directly were silently skipped.
- The skip surfaced only during Phase 12 cutover when components started 404-ing.
- Root cause: «exit criteria» relied on assertions («tests pass») instead of grep-guards on banned patterns.

## proposal
- Each multi-phase initiative declares a list of «forbidden patterns» (regex over the source tree, scoped to a path) as part of its checklist.
- Phase exit step runs the grep-guard. Non-zero hits = phase incomplete.
- Wired as a CI step that runs on every PR, fed from a per-feature `guards.toml` file or inline checklist section.
- Cutover phases run the full guard set as their final pre-commit step.

## acceptance
- [ ] Migration checklists include a `## grep guards` section enumerating banned patterns + scoped paths.
- [ ] Each phase commit body lists which grep guards it cleared (zero-hit confirmation).
- [ ] CI fails the PR if any active guard has a hit.
- [ ] Cutover phase guard catches everything prior phases left behind.

## rejected
| alt | reason |
|---|---|
| Trust per-phase agent reports | proven unreliable — agents skip without flagging. |
| Add full e2e tests instead | covered separately; grep-guard is faster and works on static code. |
| Lint rules with custom no-restricted-imports | works for imports only; misses string patterns and out-of-tree concerns. |
