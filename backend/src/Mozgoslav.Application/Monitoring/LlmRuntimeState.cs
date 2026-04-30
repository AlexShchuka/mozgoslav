using System;

namespace Mozgoslav.Application.Monitoring;

public sealed record LlmRuntimeState(
    string Endpoint,
    bool Online,
    DateTime LastProbedAt,
    string Model,
    int ContextLength,
    bool SupportsToolCalling,
    bool SupportsJsonMode,
    string? LastError);
