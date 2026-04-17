using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// ADR-007-shared §2.6 BC-025 — iterates every ProcessedNote whose
/// <c>ExportedToVault</c> flag is false, calls the existing per-note
/// <see cref="IMarkdownExporter"/>, and aggregates the result into a
/// <see cref="BulkExportResult"/>.
/// <para>
/// Failure isolation: a single exception (missing profile, missing
/// transcript, IO error) does not abort the batch. The offending note is
/// recorded in <see cref="BulkExportResult.Failures"/>; other notes continue
/// to export. Manual notes (BC-022) have <c>TranscriptId = Guid.Empty</c> and
/// are reported as a failure with reason "manual note has no transcript" —
/// they should be exported through a different code path (future work).
/// </para>
/// </summary>
public sealed class ObsidianBulkExportService : IObsidianExportService
{
    private readonly IProcessedNoteRepository _notes;
    private readonly IProfileRepository _profiles;
    private readonly ITranscriptRepository _transcripts;
    private readonly IMarkdownExporter _exporter;
    private readonly IAppSettings _settings;
    private readonly ILogger<ObsidianBulkExportService> _logger;

    public ObsidianBulkExportService(
        IProcessedNoteRepository notes,
        IProfileRepository profiles,
        ITranscriptRepository transcripts,
        IMarkdownExporter exporter,
        IAppSettings settings,
        ILogger<ObsidianBulkExportService> logger)
    {
        _notes = notes;
        _profiles = profiles;
        _transcripts = transcripts;
        _exporter = exporter;
        _settings = settings;
        _logger = logger;
    }

    public async Task<BulkExportResult> ExportAllUnexportedAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_settings.VaultPath))
        {
            throw new InvalidOperationException("Vault path is not configured");
        }

        var exported = 0;
        var skipped = 0;
        var failures = new List<BulkExportFailure>();

        var all = await _notes.GetAllAsync(ct);
        foreach (var note in all)
        {
            if (note.ExportedToVault)
            {
                skipped++;
                continue;
            }

            try
            {
                var profile = await _profiles.GetByIdAsync(note.ProfileId, ct);
                if (profile is null)
                {
                    failures.Add(new BulkExportFailure(note.Id, "profile missing"));
                    continue;
                }
                var transcript = note.TranscriptId == Guid.Empty
                    ? null
                    : await _transcripts.GetByIdAsync(note.TranscriptId, ct);
                if (transcript is null && note.TranscriptId != Guid.Empty)
                {
                    failures.Add(new BulkExportFailure(note.Id, "transcript missing"));
                    continue;
                }

                note.VaultPath = await _exporter.ExportAsync(note, profile, _settings.VaultPath, ct);
                note.ExportedToVault = true;
                await _notes.UpdateAsync(note, ct);
                exported++;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or InvalidOperationException)
            {
                _logger.LogWarning(ex, "Bulk export failed for note {NoteId}", note.Id);
                failures.Add(new BulkExportFailure(note.Id, ex.Message));
            }
        }

        _logger.LogInformation(
            "Bulk export complete: exported={Exported}, skipped={Skipped}, failures={Failures}",
            exported, skipped, failures.Count);
        return new BulkExportResult(exported, skipped, failures);
    }
}
