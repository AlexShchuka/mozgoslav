namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-007-shared §2.6 BC-025 — bulk export of every not-yet-exported
/// <c>ProcessedNote</c> into the configured Obsidian vault. The service
/// reuses the single-note <see cref="IMarkdownExporter"/> behind the scenes
/// so filename deduplication and error handling stay consistent.
/// </summary>
public interface IObsidianExportService
{
    Task<BulkExportResult> ExportAllUnexportedAsync(CancellationToken ct);
}

/// <summary>Shape frozen by ADR-007-shared §2.6.</summary>
public sealed record BulkExportResult(
    int ExportedCount,
    int SkippedCount,
    IReadOnlyList<BulkExportFailure> Failures);

public sealed record BulkExportFailure(Guid NoteId, string Reason);
