using System;

namespace Mozgoslav.Infrastructure.Prompts;

public sealed class PromptTemplateEntity
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
