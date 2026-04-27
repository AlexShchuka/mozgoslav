# searxng-sidecar

Coding contract for the SearXNG self-hosted sidecar sub-directory.

Inherits all rules from the root CLAUDE.md / AGENTS.md. Key additions:

- This directory contains no application code — only `settings.yml`, `launch.sh`, dependency manifests, and docs.
- Do not add Python application code here. The SearXNG process is launched as-is from its own venv.
- `settings.yml` is the bundled seed config. User edits live in `~/Library/Application Support/Mozgoslav/searxng/settings.yml`.
- Pin the SearXNG version in `requirements.txt`. Renovate manages updates.
- Do not add a `.env` file with secrets. The `secret_key` in `settings.yml` is a local-only value with no external exposure.
- Outbound: SearXNG reaches configured upstream engines (DDG / Yandex / Google). This is user-controlled and privacy-anonymized (IP hidden). No other outbound calls from this sidecar.
