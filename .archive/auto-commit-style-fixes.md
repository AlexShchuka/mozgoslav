# auto-commit style fixes on PR

Wrap `dotnet format whitespace`, `prettier --write`, `black`, `ruff --fix` in a GitHub Action that commits the result back to the PR branch when running under an AI-agent context. Today CI fails on format drift and the author fixes it by hand — self-healing avoids the round-trip.

Guard: skip on forks (no push perms), skip when commit message tagged `[no-autofix]`, never rewrite non-fast-forward history.
