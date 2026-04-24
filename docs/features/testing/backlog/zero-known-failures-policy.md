---
id: testing-zero-known-failures-policy
status: proposed
audience: agent
---

# testing-zero-known-failures-policy

## context
Pre-existing test failures accumulate across phases. Each phase report says «N pre-existing failures unrelated to this phase» — and the failures persist forever.

## problem
- Two frontend tests (`Onboarding — Skip button`, `NotesList — organize button — applyLayout`) failed at end of Phase 7. Five phases later they were still red, normalised as «expected».
- New genuine failures hide under the existing-failure noise.
- Both agents and humans stop trusting the test signal.

## proposal
- Hard policy: zero failing tests on `main`. CI blocks merge on any failure, no exemptions.
- When a test fails for an unrelated reason mid-phase: skip+ticket workflow — the test is `[Ignore]`-d (`.skip`) in the same commit, with a `bugs/<feature>/<slug>.md` filed referencing the skip.
- A scheduled «unskip sweep» backlog runs weekly to triage and clear `[Ignore]`-s.
- Lint rule: `.skip` / `[Ignore]` without an inline `// see bugs/<file>` comment fails CI.

## acceptance
- [ ] `main` branch protection requires zero test failures.
- [ ] No `[Ignore]` / `.skip` survives without a corresponding `bugs/` file referencing it.
- [ ] The two pre-existing frontend failures are either fixed or documented as bugs and `[Ignore]`-d.
- [ ] Lint rule lands and CI catches a deliberate violation.

## rejected
| alt | reason |
|---|---|
| Tolerate N known failures | normalises decay; signal degrades. |
| Auto-quarantine flaky tests | hides root cause; same drift. |
| Accept «pre-existing» as a category | what we have today — the problem statement. |
