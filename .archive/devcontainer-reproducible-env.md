# devcontainer — reproducible env

Ship a `.devcontainer/devcontainer.json` that pins .NET 10, Node 24, Python 3.12, ffmpeg and Swift tooling. Any agent (and any contributor on any machine) starts from an identical toolchain — nothing left to ambient `brew install`, no "works on my Mac" drift. Mirrors the versions used by CI.
