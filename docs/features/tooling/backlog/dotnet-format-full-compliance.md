# `dotnet format` full compliance

CI verifies whitespace only today because the full `dotnet format --verify-no-changes` fails on pre-existing IDE0370 unnecessary suppressions and CS8618 `TestContext` initialisation patterns. Sweep the repo, fix the analyser findings (drop stale suppressions, mark MSTest `TestContext` as `required` or initialise with `null!`), then switch the CI lint step from `whitespace` to full format verification.
