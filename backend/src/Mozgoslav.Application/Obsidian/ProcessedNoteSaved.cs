using System;

namespace Mozgoslav.Application.Obsidian;

public sealed record ProcessedNoteSaved(
    Guid NoteId,
    Guid ProfileId,
    DateTimeOffset SavedAt);
