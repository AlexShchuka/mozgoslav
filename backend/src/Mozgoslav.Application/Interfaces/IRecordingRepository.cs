using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IRecordingRepository
{
    Task<Recording> AddAsync(Recording recording, CancellationToken ct);
    Task<Recording?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Recording?> GetBySha256Async(string sha256, CancellationToken ct);
    Task<IReadOnlyList<Recording>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(Recording recording, CancellationToken ct);
}
