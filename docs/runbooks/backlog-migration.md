# Runbook — backlog / bugs / decisions migration to GitHub Issues

One-shot import of markdown under `docs/features/<feature>/{backlog,bugs,decisions}/*.md` into labelled GitHub Issues. The tree was migrated once; this runbook exists for the rare case of re-import (new repo fork, vault restore, etc.).

## Script

`scripts/migrate-docs-to-issues.sh`. Idempotent by construction: iterates whatever still lives under `docs/features/**/*.md`. After a successful run the source files are `git mv`'d flat into `.archive/<feature>-<type>-<slug>.md`; a second run finds nothing to do.

## Run

```bash
export GH_TOKEN=<github personal access token with repo + issues write scopes>
bash scripts/migrate-docs-to-issues.sh
```

Optional:

- `REPO_SLUG=<owner>/<name>` — overrides the repo inferred from `origin`.
- `DRY_RUN=1` — prints planned actions, creates no Issues, touches no files.

The script:

1. Ensures labels exist: `feature/<name>` (one per folder under `docs/features/`), `type/backlog`, `type/bug`, `type/decision`, and `status/<value>` for every distinct YAML frontmatter status it sees.
2. For each markdown file: title = first `# heading` (fallback: basename without extension). Body = original markdown prefixed with `<!-- migrated from <path> -->`. Labels = `feature/<dir>` + `type/{backlog|bug|decision}` + optional `status/*`.
3. `git mv`'s the source into `.archive/<feature>-<type>-<basename>.md`. If the destination already exists the script appends a UTC timestamp to avoid collisions.

## Acceptance

```bash
gh issue list --repo <owner>/<name> --label type/backlog --state all --limit 500 | wc -l
find docs/features -type f -name '*.md' | wc -l   # expect 0
ls .archive/ | wc -l                              # expect += migrated count
```

## Failure recovery

- Label creation fails with `could not add label` on `type/decisions` or `type/bugs` — you are running a pre-fix copy of the script; the loop uses singular label names (`type/decision`, `type/bug`) internally. Pull latest.
- `gh issue create` times out mid-run — re-run the script; already-archived files are skipped. No duplicate Issues get created.
- Rate-limit hit (`API rate limit exceeded`) — wait; the authenticated limit is 5000/h. For 60+ files you should never hit it.

## Rollback

The migration is reversible by `git revert` of the migration commit: the archive moves and file contents return, and the script does not delete anything on GitHub. Created Issues are closed manually if rollback is desired.
