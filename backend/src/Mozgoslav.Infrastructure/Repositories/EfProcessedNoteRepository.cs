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

    public async Task<IReadOnlyList<ProcessedNote>> GetAllAsync(CancellationToken ct) =>
        await _db.ProcessedNotes.AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(ct);

    public async Task UpdateAsync(ProcessedNote note, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(note);
        _db.ProcessedNotes.Update(note);
        await _db.SaveChangesAsync(ct);
    }
}
