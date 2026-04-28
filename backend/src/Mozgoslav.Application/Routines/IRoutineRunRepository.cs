using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Routines;

public interface IRoutineRunRepository
{
    Task<RoutineRun> AddAsync(RoutineRun run, CancellationToken ct);
    Task UpdateAsync(RoutineRun run, CancellationToken ct);
    Task<RoutineRun?> TryGetLatestAsync(string routineKey, CancellationToken ct);
    Task<IReadOnlyList<RoutineRun>> ListByKeyAsync(string routineKey, int limit, CancellationToken ct);
}
