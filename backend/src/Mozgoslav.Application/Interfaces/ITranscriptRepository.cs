using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface ITranscriptRepository
{
    Task<Transcript> AddAsync(Transcript transcript, CancellationToken ct);
    Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Transcript?> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
}
