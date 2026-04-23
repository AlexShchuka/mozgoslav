# coverage floor in CI

`dotnet test --collect:"XPlat Code Coverage"` + a minimum threshold gate (start at 60% line coverage for Domain + Application, lower for Infrastructure). Same treatment on the frontend via Jest `--coverage` + per-folder threshold in the Jest config. A PR that drops coverage below the floor fails — not just a "tests passed" signal.
