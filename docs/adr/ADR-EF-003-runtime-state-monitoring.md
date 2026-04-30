---
adr: EF-003
title: Runtime state monitoring via GraphQL subscription
status: Accepted
date: 2026-04-30
related: [ADR-EC-002-llm-provider-capability-gate]
authors: [shuka]
---

# ADR-EF-003 — Runtime state monitoring via GraphQL subscription

## Status

Accepted, 2026-04-30.

## Context

The LLM capability probe runs at startup and results are cached in
`InMemoryLlmCapabilitiesCache`, but the UI has no way to observe this state
without polling. When the LLM endpoint is offline, every GraphQL operation that
touches LLM triggers a 3-retry Polly storm, producing stack traces in logs
and unresponsive UI behaviour. Users have no clear signal that the endpoint is
down.

Additionally, Syncthing and Electron-managed sidecars (`python-sidecar`,
`searxng-sidecar`, `dictation-helper`) have no backend-visible presence, so a
unified monitoring surface needs a design that accommodates both backend-owned
and Electron-owned state.

## Decision

**Unified `RuntimeState` aggregate** with three sub-states:

- `LlmRuntimeState` — endpoint, online flag, last probe timestamp, model,
  context length, capabilities, last error.
- `SyncthingRuntimeState` — detection result (not-installed | installed-not-running | running | error),
  binary path, API URL, version, human-readable hint.
- `SupervisorServiceState` list — per-sidecar name, state, error, restart count,
  PID, port; populated by Electron via the loopback mutation below.

**GraphQL surface:**

- `query { runtimeState { ... } }` — snapshot.
- `subscription { runtimeStateChanged { ... } }` — push on every reprobe or
  Electron-services update.
- `mutation { reprobeRuntimeState { state errors } }` — re-runs the LLM probe
  and Syncthing detection, broadcasts via the subscription topic.
- `mutation { publishElectronServices(input: { services: [...] }) { state errors } }` —
  loopback-only (returns `LOOPBACK_ONLY` UserError if `RemoteIpAddress` is not
  a loopback address); stores the service list in memory and broadcasts.

**Option A (self-report only) was chosen over option B (REST loopback endpoint)**
because the GraphQL mutation reuses the existing subscription broadcast path and
requires no new REST endpoints. The Electron supervisor calls this mutation over
the existing IPC → backend channel.

**Syncthing detection** runs synchronously (no process spawn, no network call):
checks env vars `MOZGOSLAV_SYNCTHING_BINARY` / `SYNCTHING_BINARY`, then PATH.
Does not start or probe Syncthing itself — that is `SyncthingLifecycleService`'s
responsibility.

**LLM offline gate (gotcha #15 respected):** only confirmed `Online=false` state
triggers `UserError("LLM offline — see Monitoring")` at LLM-touching consumers.
When the cache is empty (probe data missing, fresh startup), callers proceed
permissively — probe opted-in features, not base behaviour.

## Consequences

- Zero stack traces from offline LLM after the first offline transition (only
  one `LogWarning` per online→offline edge).
- The Monitoring page becomes the single user-visible entrypoint for "is anything
  broken?".
- Electron supervisor wires to `publishElectronServices` mutation on service
  state changes (B4 scope).
- Future sidecars register as a `SupervisorServiceState` with a new `Name` value
  — no schema change needed.
- `SyncthingDetectionService` is a pure synchronous function with no side effects;
  safe to call on every probe cycle.

## Alternatives rejected

| Option | Reason |
|---|---|
| REST loopback endpoint for Electron | Extra REST surface area; mutations already solve broadcast without a separate endpoint. |
| Polling from frontend | Defeats the purpose of the subscription; higher latency and more backend load. |
| Embedding probe data in startup logs only | Not user-visible; does not address the retry-storm problem. |
