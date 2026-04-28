using System;

namespace Mozgoslav.Application.Llm;

public sealed record LlmCapabilities(
    bool SupportsToolCalling,
    bool SupportsJsonMode,
    int CtxLength,
    double TokensPerSecond,
    DateTimeOffset ProbedAt);
