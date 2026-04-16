using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProfileRepository
{
    Task<Profile> AddAsync(Profile profile, CancellationToken ct);
    Task<Profile?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Profile?> TryGetDefaultAsync(CancellationToken ct);
    Task<IReadOnlyList<Profile>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(Profile profile, CancellationToken ct);
}
