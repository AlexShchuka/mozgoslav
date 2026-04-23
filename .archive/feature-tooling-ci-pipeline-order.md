# CI pipeline order

First wave, parallel: auto-lint (`dotnet format` + `eslint` + `prettier` + `ruff` + `black`), comment stripper (`uncomment --dry-run`), secret scan (`gitleaks`). Any wave-1 failure blocks wave 2.

Second wave, on a green wave 1: builds and tests (`dotnet build`, `dotnet test`, `npm run build`, `npm test`, `pytest`).

Mirror the first wave as lefthook pre-commit on staged files so the signal fires locally before the push.
