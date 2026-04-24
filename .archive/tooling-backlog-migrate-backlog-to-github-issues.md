---
id: tooling-migrate-backlog-to-github-issues
status: proposed
audience: agent
---

# tooling-migrate-backlog-to-github-issues

## context
Backlog and bug items live as files under `docs/features/<name>/backlog/` and `docs/features/<name>/bugs/`. Search, prioritisation, status, assignment, comments and cross-linking happen out of band (Slack / mind / nowhere).

## problem
- Cannot answer «what's the priority queue» or «who is on what» without reading every file.
- Cross-linking between items is manual and rots.
- External contributors cannot subscribe to issues they care about.
- Status field in YAML frontmatter is rarely updated; truth drifts from filename to git history.
- File-based backlog scales to ~30 items; beyond that, discovery falls apart.

## proposal
Migrate every existing `backlog/<slug>.md` and `bugs/<slug>.md` to a GitHub Issue:

- one-shot migration script using `gh api`:
  - title = file's first `# heading`
  - body = file content (preserved markdown)
  - labels:
    - `feature/<folder-name>` (e.g. `feature/api`, `feature/dictation`)
    - `type/backlog` or `type/bug`
    - `status/<value-from-frontmatter>` if present
  - milestone or project assigned per heuristic (open question)
- the source file becomes either:
  - a 2-line stub `> Moved to <issue-url>`, OR
  - `git mv`-ed to `.archive/` per the existing retire convention.
- new items open as GitHub Issues directly.
- decisions stay in repo — they are versioned with code, robot-readable, and source for AI context.

CLAUDE.md is updated:
- backlog now lives in GitHub Issues.
- bugs now live in GitHub Issues.
- decisions (`docs/features/<name>/decisions/`) stay in repo as the only «doc» tree.
- a new opening convention: `feature/<name>` label is mandatory; first comment is the «context» block from the old YAML.

CI guard: a new `**/backlog/*.md` or `**/bugs/*.md` PR triggers a comment suggesting «open as a GitHub Issue instead».

## acceptance
- [ ] Migration script lives at `scripts/migrate-backlog-to-issues.sh`, idempotent (skips already-migrated by checking for the stub).
- [ ] Every existing backlog and bugs file is either stubbed-out or in `.archive/`.
- [ ] CI guard wired and tested.
- [ ] CLAUDE.md updated with the new policy.
- [ ] Labels `feature/*`, `type/backlog`, `type/bug`, `status/*` exist in the GitHub repo.

## rejected
| alt | reason |
|---|---|
| Stay on filesystem backlog | does not scale; no priority queue; no external visibility. |
| Move decisions to issues too | decisions are versioned alongside code; they belong in repo. |
| GitHub Discussions instead | weaker structure for actionable backlog items. |
| Yandex Tracker / Linear / Jira | another tool; mozgoslav is a personal project, GitHub-native fits. |

## open
- [ ] confirm whether to stub-out source files or `git mv` them to `.archive/`.
- [ ] confirm milestone / project assignment heuristic.
- [ ] confirm GitHub Project (v2) board layout — single board, columns by `status/*` label.
