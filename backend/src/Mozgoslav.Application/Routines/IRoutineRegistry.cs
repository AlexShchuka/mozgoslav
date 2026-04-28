using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Routines;

public interface IRoutineRegistry
{
    Task<IReadOnlyList<RoutineDefinition>> ListAsync(CancellationToken ct);
    Task<RoutineRun> RunNowAsync(string key, CancellationToken ct);
    Task ToggleAsync(string key, bool enabled, CancellationToken ct);
}
