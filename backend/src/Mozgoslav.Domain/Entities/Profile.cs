using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class Profile
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;

    /// <summary>
    /// Optional per-profile override of the Whisper initial prompt. When empty,
    /// the default global prompt is used.
    /// </summary>
    public string TranscriptionPromptOverride { get; set; } = string.Empty;

    public string OutputTemplate { get; set; } = string.Empty;
    public CleanupLevel CleanupLevel { get; set; } = CleanupLevel.Light;
    public string ExportFolder { get; set; } = "_inbox";
    public List<string> AutoTags { get; set; } = [];
    public bool IsDefault { get; set; }
    public bool IsBuiltIn { get; set; }
}
