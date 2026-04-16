using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Domain.Entities;

public class ProcessedNote
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid TranscriptId { get; init; }
    public Guid ProfileId { get; init; }
    public int Version { get; init; } = 1;
    public string Summary { get; set; } = string.Empty;
    public List<string> KeyPoints { get; set; } = [];
    public List<string> Decisions { get; set; } = [];
    public List<ActionItem> ActionItems { get; set; } = [];
    public List<string> UnresolvedQuestions { get; set; } = [];
    public List<string> Participants { get; set; } = [];
    public string Topic { get; set; } = string.Empty;
    public ConversationType ConversationType { get; set; } = ConversationType.Other;
    public string CleanTranscript { get; set; } = string.Empty;
    public string FullTranscript { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = [];
    public string MarkdownContent { get; set; } = string.Empty;
    public bool ExportedToVault { get; set; }
    public string? VaultPath { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
