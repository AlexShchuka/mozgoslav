using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Repositories;

public sealed class EfProcessedNoteRepository : IProcessedNoteRepository
{
    private readonly MozgoslavDbContext _db;

    public EfProcessedNoteRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<ProcessedNote> AddAsync(ProcessedNote note, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(note);
        _db.ProcessedNotes.Add(note);
        await _db.SaveChangesAsync(ct);
        return note;
    }

    public Task<ProcessedNote?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.ProcessedNotes.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id, ct);

    public async Task<IReadOnlyList<ProcessedNote>> GetByTranscriptIdAsync(Guid transcriptId, CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .Where(n => n.TranscriptId == transcriptId)
            .OrderByDescending(n => n.Version)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessedNote>> GetByRecordingIdsAsync(IReadOnlyList<Guid> recordingIds, CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .Join(
                _db.Transcripts.AsNoTracking().Where(t => recordingIds.Contains(t.RecordingId)),
                note => note.TranscriptId,
                transcript => transcript.Id,
                (note, transcript) => new { note, transcript.RecordingId })
            .Select(x => x.note)
            .ToListAsync(ct);

    public Task<int> CountAsync(CancellationToken ct) =>
        _db.ProcessedNotes.CountAsync(ct);

    public async Task<IReadOnlyList<ProcessedNote>> GetAllAsync(CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessedNote>> GetByProfileIdAsync(Guid profileId, CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .Where(n => n.ProfileId == profileId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ProcessedNote>> GetByDateRangeAsync(DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct)
    {
        var from = fromUtc.UtcDateTime;
        var to = toUtc.UtcDateTime;
        return await _db.ProcessedNotes.AsNoTracking()
            .Where(n => n.CreatedAt >= from && n.CreatedAt < to)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProcessedNote>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .Where(n => ids.Contains(n.Id))
            .ToListAsync(ct);

    public async Task UpdateAsync(ProcessedNote note, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(note);
        _db.ProcessedNotes.Update(note);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> TryDeleteAsync(Guid id, CancellationToken ct)
    {
        var note = await _db.ProcessedNotes.FirstOrDefaultAsync(n => n.Id == id, ct);
        if (note is null)
        {
            return false;
        }
        _db.ProcessedNotes.Remove(note);
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
