using System;
using System.Collections.Generic;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class Profile
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;

    public string TranscriptionPromptOverride { get; set; } = string.Empty;

    public string OutputTemplate { get; set; } = string.Empty;
    public CleanupLevel CleanupLevel { get; set; } = CleanupLevel.Light;
    public string ExportFolder { get; set; } = "_inbox";
    public List<string> AutoTags { get; set; } = [];
    public bool IsDefault { get; set; }
    public bool IsBuiltIn { get; set; }

    public Dictionary<string, List<string>> GlossaryByLanguage { get; set; } = [];

    public bool LlmCorrectionEnabled { get; set; }

    public string LlmProviderOverride { get; set; } = string.Empty;
    public string LlmModelOverride { get; set; } = string.Empty;
}
