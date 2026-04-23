# auto code-style script

One entry point that applies code style across the whole repo, invokable by agents and humans alike.

Scope:
- strip `//` and `/* */` comments from C#, TS/JS, Swift; strip `#` comments from Python (preserve shebangs and tool directives like `# noqa`, `# type:`).
- run `dotnet format`, `eslint --fix`, `prettier --write`, `ruff --fix` + `black`.
- optional `swift-format` when installed.

Complements lefthook (`.github/lefthook.yml`), which runs the same formatters but only on staged files at commit time. The new script is an explicit, whole-repo invocation.
