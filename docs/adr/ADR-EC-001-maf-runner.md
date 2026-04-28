---
adr: EC-001
title: Agent runner — Microsoft Agent Framework 1.0
status: Accepted
date: 2026-04-28
implemented_in: PR #224
related: [ADR-EC-002-llm-provider-capability-gate]
parent: "#147"
authors: [shuka]
---

# ADR-EC-001 — Agent runner: Microsoft Agent Framework 1.0

## Status

Accepted, 2026-04-28. Implemented in PR #224 (merged 2026-04-28). Closes
issue #168.

## Decision

Agent runner для мозгослава — Microsoft Agent Framework 1.0 (MAF). MIT,
.NET-native, MCP first-class (client + server), GA 2026-04-03.

## Context

Pillar 3 требует agent loop. Альтернативы (LangGraph в python-sidecar, DIY на
300-500 LOC, OpenClaw) рассмотрены и отклонены.

## Consequences

- Backend получает MAF NuGet refs.
- `IAgentRunner` port → `MafAgentRunner` default + `NoOpAgentRunner` fallback.
- MCP-server и MCP-client — оба через MAF (не отдельный stack).
- Quartz и MAF разделение: Quartz = internal pipeline jobs;
  Quartz-triggered MAF flows = user-facing routines.
- Capability-detection LLM (function calling / JSON / ctx) — обязательна
  (EC.11), иначе слабые модели роняют agent loop.

## Alternatives rejected

| alt | reason |
|---|---|
| LangGraph в python-sidecar | C# ↔ Python ↔ MCP цикл, IPC overhead |
| DIY 300-500 LOC | Edge-cases ловить самому, под слабые модели — особенно |
| OpenClaw embedded | 90% веса не наше (multi-channel, voice wake), 14k issues |
| sst/opencode | Code-task agent, не general-purpose |

## Implementation evidence

`backend/src/Mozgoslav.Api/Program.cs:374-385` registers `MafAgentRunner`
with constructor injection of `ILlmProviderFactory`,
`ILlmCapabilitiesCache`, and the four built-in tools
(`CorpusQueryTool`, `WebSearchTool`, `WebFetchTool`, `ObsidianReadTool`).
The `NoOpAgentRunner` fallback is selected when
`Mozgoslav:Agents:Provider` is set to `"NoOp"`.
