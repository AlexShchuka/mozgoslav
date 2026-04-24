# unused code detection

Frontend: `knip` (or `ts-prune`) to flag dead exports, unused files, unused dependencies. Start as `allow_failure: true` in CI so a noisy first run does not block the pipeline; tighten to hard fail once the baseline is clean. Backend: enable IDE0051 / IDE0052 (unused private members) and Roslynator's unused-symbol pack in `dotnet format style`.
