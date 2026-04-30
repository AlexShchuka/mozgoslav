namespace Mozgoslav.Application.Llm;

public sealed record LlmModelDescriptor(
    string Id,
    string? OwnedBy,
    int? ContextLength,
    bool? SupportsToolCalling,
    bool? SupportsJsonMode);
