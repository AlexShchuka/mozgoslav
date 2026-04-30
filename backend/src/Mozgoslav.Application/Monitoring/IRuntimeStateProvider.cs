using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Monitoring;

public interface IRuntimeStateProvider
{
    Task<RuntimeState> GetCurrentAsync(CancellationToken ct);
    Task<RuntimeState> ReprobeAsync(CancellationToken ct);
    Task UpdateElectronServicesAsync(IReadOnlyList<SupervisorServiceState> services, CancellationToken ct);
}
