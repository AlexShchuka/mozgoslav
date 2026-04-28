using System;

namespace Mozgoslav.Application.Prompts;

public sealed record PromptTemplate(
    Guid Id,
    string Name,
    string Body,
    DateTimeOffset CreatedAt);
