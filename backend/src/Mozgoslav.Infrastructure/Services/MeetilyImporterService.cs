using System.Globalization;

using Dapper;

using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Reads the Meetily desktop app's SQLite database (<c>meeting_minutes.sqlite</c>)
/// and imports each meeting as a Mozgoslav Recording + Transcript, so the user can
/// re-run them through any of our profiles. Idempotent: a meeting whose audio file
/// already exists as a Recording (by SHA-256 or path) is skipped.
/// </summary>
public sealed class MeetilyImporterService
{
    public record ImportReport(int TotalMeetings, int ImportedRecordings, int SkippedDuplicates, int Errors);

    private readonly IRecordingRepository _recordings;
    private readonly ITranscriptRepository _transcripts;
    private readonly ILogger<MeetilyImporterService> _logger;

    public MeetilyImporterService(
        IRecordingRepository recordings,
        ITranscriptRepository transcripts,
        ILogger<MeetilyImporterService> logger)
    {
        _recordings = recordings;
        _transcripts = transcripts;
        _logger = logger;
    }

    public async Task<ImportReport> ImportAsync(string meetilyDatabasePath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(meetilyDatabasePath);
        if (!File.Exists(meetilyDatabasePath))
        {
            throw new FileNotFoundException("Meetily database not found", meetilyDatabasePath);
        }

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = meetilyDatabasePath,
            Mode = SqliteOpenMode.ReadOnly
        }.ToString();

        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(ct);

        var tables = (await connection.QueryAsync<string>(
            "SELECT name FROM sqlite_master WHERE type='table'")).ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!tables.Contains("meetings") && !tables.Contains("transcripts"))
        {
            throw new InvalidOperationException(
                "Meetily schema not recognised: expected 'meetings' and/or 'transcripts' tables.");
        }

        var rows = await connection.QueryAsync<MeetilyRow>("""
            SELECT
                m.id           AS Id,
                m.title        AS Title,
                m.audio_path   AS AudioPath,
                m.created_at   AS CreatedAt,
                t.text         AS TranscriptText
            FROM meetings m
            LEFT JOIN transcripts t ON t.meeting_id = m.id
            ORDER BY m.created_at;
            """);

        int imported = 0, skipped = 0, errors = 0;
        var list = rows.ToList();

        foreach (var row in list)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(row.AudioPath) || !File.Exists(row.AudioPath))
                {
                    skipped++;
                    continue;
                }

                var sha = await HashCalculator.Sha256Async(row.AudioPath, ct);
                if (await _recordings.GetBySha256Async(sha, ct) is not null)
                {
                    skipped++;
                    continue;
                }

                var format = AudioFormatDetector.TryFromExtension(Path.GetExtension(row.AudioPath), out var parsed)
                    ? parsed
                    : AudioFormat.Wav;

                var recording = new Recording
                {
                    FileName = Path.GetFileName(row.AudioPath),
                    FilePath = row.AudioPath,
                    Sha256 = sha,
                    Format = format,
                    SourceType = SourceType.Imported,
                    Status = RecordingStatus.Transcribed,
                    CreatedAt = ParseDate(row.CreatedAt)
                };
                await _recordings.AddAsync(recording, ct);

                if (!string.IsNullOrWhiteSpace(row.TranscriptText))
                {
                    await _transcripts.AddAsync(new Transcript
                    {
                        RecordingId = recording.Id,
                        ModelUsed = "meetily-import",
                        Language = "ru",
                        RawText = row.TranscriptText,
                        CreatedAt = DateTime.UtcNow
                    }, ct);
                }

                imported++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to import Meetily meeting {Id}", row.Id);
                errors++;
            }
        }

        return new ImportReport(list.Count, imported, skipped, errors);
    }

    private static DateTime ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DateTime.UtcNow;
        }
        return DateTime.TryParse(value, CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out var parsed)
            ? parsed
            : DateTime.UtcNow;
    }

    private sealed class MeetilyRow
    {
        public string? Id { get; init; }
        public string? Title { get; init; }
        public string? AudioPath { get; init; }
        public string? CreatedAt { get; init; }
        public string? TranscriptText { get; init; }
    }
}
