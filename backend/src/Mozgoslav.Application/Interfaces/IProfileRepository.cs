using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProfileRepository
{
    Task<Profile> AddAsync(Profile profile, CancellationToken ct);
    Task<Profile?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Profile?> TryGetDefaultAsync(CancellationToken ct);
    Task<IReadOnlyList<Profile>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(Profile profile, CancellationToken ct);

    /// <summary>
    /// Deletes a user-created profile. Built-in profiles cannot be removed and
    /// the call returns <c>false</c> for them (and for unknown ids).
    /// </summary>
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
}
