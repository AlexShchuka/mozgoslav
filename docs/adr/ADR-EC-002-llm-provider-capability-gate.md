---
adr: EC-002
title: LLM provider capability-aware response_format and one-time model resolution
status: Accepted
date: 2026-04-28
related: [ADR-EC-001-maf-runner]
authors: [shuka]
---

# ADR-EC-002 — Capability-aware `response_format` and one-time `/v1/models` resolution

## Status

Accepted, 2026-04-28.

## Context

Mozgoslav targets local OpenAI-compatible LLM endpoints — primarily LM Studio
and Ollama. A capability cache (`ILlmCapabilitiesCache`,
`backend/src/Mozgoslav.Application/Llm/`) is populated at startup by
`LlmCapabilitiesStartupProbe` (`backend/src/Mozgoslav.Infrastructure/Hosting/`).
The probe exposes `SupportsToolCalling`, `SupportsJsonMode`, `CtxLength`,
`TokensPerSecond`, `ProbedAt`. `MafAgentRunner` consumes the cache to gate
agent loops on tool-calling support.

`OpenAiCompatibleLlmProvider`, however, ignored the cache:

* It unconditionally sent `response_format = { type: "json_object" }` on every
  chat completion. The only first-party caller (`LlmCorrectionService.BuildSystemPrompt`)
  asks the model for plain corrected text — not JSON. LM Studio rejects this
  combination with a 400 for most models that do not advertise JSON mode,
  killing the dictation-cleanup loop on weaker quants.
* It sent the literal `model: "default"` when `IAppSettings.LlmModel` was empty.
  Most servers reject the literal `default` because nothing is loaded under
  that name. The fix needs to query `/v1/models` and pick a real id —
  but only once per process, not per chat call.

The fix has to land inside the provider rather than at the call sites because
several call sites already exist (LlmCorrectionService, OpenAiCompatibleLlmService,
MafAgentRunner via `ILlmProviderFactory`) and adding a per-caller flag every
time a new caller appears is the same trap repeated.

## Decision

1. Inject `ILlmCapabilitiesCache` into `OpenAiCompatibleLlmProvider`. Read
   `TryGetCurrent()` on each `ChatAsync` call:

   * If `caps?.SupportsJsonMode == true` — send `response_format`.
   * Otherwise (cache empty OR probe said `false`) — omit the field entirely.
     This is the permissive default that all OpenAI-compatible servers accept.

2. Add a one-time model-resolution helper `ResolveModelOnceAsync` with an
   instance-level cache (`string? _resolvedModel`) protected by a
   `SemaphoreSlim`. The provider is registered as a Singleton at
   `backend/src/Mozgoslav.Api/Program.cs:201`, so the cache is process-wide.

   * If `IAppSettings.LlmModel` is non-empty AND not the literal `default`
     (case-insensitive) — return it as-is.
   * Otherwise — `GET <endpoint>/v1/models`, take `data[0].id`, store it in
     the field, and return it. Subsequent `ChatAsync` calls reuse the cached
     id without further `/v1/models` calls.

3. On a non-success chat response, read the body via
   `Content.ReadAsStringAsync(ct)`, take `Math.Min(body.Length, 256)` chars,
   and log
   `LogWarning("LLM returned {StatusCode}: {BodyExcerpt}", status, excerpt)`.
   This converts an opaque red-herring 400 into an actionable error message
   (LM Studio surfaces `model 'X' is not loaded`-style hints in the body).

4. Tests cover:

   * `ChatAsync_WhenCapabilitiesNull_DoesNotSendResponseFormat`
   * `ChatAsync_WhenSupportsJsonModeFalse_DoesNotSendResponseFormat`
   * `ChatAsync_WhenSupportsJsonModeTrue_SendsResponseFormatJsonObject`
   * `ChatAsync_OnNonSuccess_LogsBodyExcerpt`
   * `ChatAsync_WhenModelEmpty_ResolvesFromV1Models_AndCachesResult`
   * `ChatAsync_WhenModelExplicit_DoesNotCallV1Models`
   * `ChatAsync_WhenModelLiteralDefault_ResolvesFromV1Models`

   Tests live under `backend/tests/Mozgoslav.Tests/Services/`.

## Consequences

* The provider works on the widest range of local servers without any user
  configuration — both quantised models that lack JSON mode and well-known
  quants that support it benefit from the same code path.
* When the user has configured a real model id, behaviour is unchanged
  (no `/v1/models` round-trip, no extra latency).
* When the user has left the model field empty, the provider performs one
  extra GET on the first chat per process, then caches the result.
* If the probe later marks `SupportsJsonMode = true`, callers that
  expect plain text (LlmCorrectionService) still work — the model
  receives `response_format: json_object` but the system prompt asks for
  plain text. This is a known foot-gun that we accept here: the
  provider should not second-guess the caller's intent. ADR-EC-003 may
  later split JSON-aware and plain-text providers; tonight we keep the
  surface area minimal.

## Alternatives rejected

| Option | Reason |
|---|---|
| Always require JSON mode, fail fast when capability is absent | Kills the local-LLM happy path for the most common LM Studio quants. |
| Force the user to enter a model id manually before any chat | Adds onboarding friction; does not solve the LM Studio default-loaded model case. |
| Remove the capability cache and probe per-request | Recreates the same 400-on-each-call problem; bypasses the entire EC.11 capability infrastructure. |
| Move JSON-mode gating to each caller | Same trap the existing code fell into — adds a flag per caller; bug surfaces on next caller added. |
