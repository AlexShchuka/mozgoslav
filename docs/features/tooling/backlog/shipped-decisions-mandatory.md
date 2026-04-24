---
id: tooling-shipped-decisions-mandatory
status: proposed
audience: agent
---

# tooling-shipped-decisions-mandatory

## context
CLAUDE.md says «New architectural decision → docs/features/<feature>/decisions/<slug>.md in robot style». No enforcement on multi-phase initiatives.

## problem
- The REST→GraphQL migration produced 14 commits but no shipped decision document. The next agent reading the repo has to reverse-engineer the architecture from git log + scattered backlog files.
- Backlog files become «authoritative» by accident because no decision file replaced them.
- Robot-style decisions are easy to skip when the work feels «just code».
- No way to scan «what architecturally significant work shipped this quarter» without trawling commits.

## proposal
- Multi-phase / architectural-impact initiatives have a mandatory final phase that publishes `docs/features/<feature>/decisions/<slug>.md`.
- The matching backlog file is `git mv`-ed to `.archive/` in the same commit.
- Checklist «exit criteria» includes the decision-file step explicitly.
- CI guard: «backlog file with `status: in-progress` (or unset) older than 30 days without a corresponding decision file → red».
- Decision file is robot-style: YAML frontmatter, bullets, concept-level only, no file paths in body.

## acceptance
- [ ] Shipped decision exists for the REST→GraphQL migration under `docs/features/api/decisions/rest-to-graphql.md`.
- [ ] Backlog `rest-to-graphql-checklist.md` and `rest-to-graphql-checklist-fixes` predecessors moved to `.archive/`.
- [ ] CI guard wired and tested with a synthetic stale backlog.
- [ ] CLAUDE.md / AGENTS.md document the «final phase = decision file» convention.

## rejected
| alt | reason |
|---|---|
| Optional decisions | already de-facto policy; produces the current gap. |
| Auto-generate decisions from commit history | no judgement on what mattered; noise. |
| ADR style instead of robot-style | repo already standardised on robot-style; mixing dialects worse than either. |
