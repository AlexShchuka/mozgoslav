using Microsoft.EntityFrameworkCore;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Repositories;

public sealed class EfTranscriptRepository : ITranscriptRepository
{
    private readonly MozgoslavDbContext _db;

    public EfTranscriptRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<Transcript> AddAsync(Transcript transcript, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(transcript);
        _db.Transcripts.Add(transcript);
        await _db.SaveChangesAsync(ct);
        return transcript;
    }

    public Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct) =>
        _db.Transcripts.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<Transcript?> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct) =>
        _db.Transcripts.AsNoTracking()
            .Where(t => t.RecordingId == recordingId)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(ct);
}
