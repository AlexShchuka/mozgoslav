using System;

namespace Mozgoslav.Application.Obsidian;

/// <summary>
/// ADR-019 §5.5 — domain event published when the ingest pipeline finishes
/// saving a processed note. The Obsidian sidecar subscribes to this event;
/// the main ingest pipeline is decoupled from Obsidian entirely.
/// </summary>
public sealed record ProcessedNoteSaved(
    Guid NoteId,
    Guid ProfileId,
    DateTimeOffset SavedAt);
