# anti-patterns doc

Explicit "do-not" catalogue next to the rules block in `CLAUDE.md` / `AGENTS.md`: primary constructors in C#, `// ...` comments in code, XML summaries, inline CSS, CSS modules, React class components, bare REST fetch in components (go through the API client), log statements with secrets, blocking calls inside sagas, env-var secrets. Each entry is one line with a concrete example. Agents pattern-match these faster than they parse positive conventions.
