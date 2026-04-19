using System;
using System.Collections.Generic;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Domain.Entities;

public sealed class ProcessedNote
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid TranscriptId { get; init; }
    public Guid ProfileId { get; init; }
    public int Version { get; init; } = 1;

    /// <summary>
    /// ADR-007 §2.6 BC-022 — distinguishes recording-derived notes from
    /// notes the user typed in manually via POST /api/notes.
    /// Defaults to <see cref="NoteSource.Processed"/> so existing pipeline
    /// code (transcription → note materialisation) stays correct with
    /// no further changes.
    /// </summary>
    public NoteSource Source { get; init; } = NoteSource.Processed;
    public string Title { get; set; } = string.Empty;
    public string Summary { get; init; } = string.Empty;
    public List<string> KeyPoints { get; init; } = [];
    public List<string> Decisions { get; init; } = [];
    public List<ActionItem> ActionItems { get; init; } = [];
    public List<string> UnresolvedQuestions { get; init; } = [];
    public List<string> Participants { get; init; } = [];
    public string Topic { get; init; } = string.Empty;
    public ConversationType ConversationType { get; init; } = ConversationType.Other;
    public string CleanTranscript { get; init; } = string.Empty;
    public string FullTranscript { get; init; } = string.Empty;
    public List<string> Tags { get; init; } = [];
    public string MarkdownContent { get; set; } = string.Empty;
    public bool ExportedToVault { get; set; }
    public string? VaultPath { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
