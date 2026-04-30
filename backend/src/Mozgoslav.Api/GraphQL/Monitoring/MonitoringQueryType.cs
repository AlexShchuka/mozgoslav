using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

[ExtendObjectType(typeof(QueryType))]
public sealed class MonitoringQueryType
{
    public async Task<RuntimeState> RuntimeState(
        [Service] IRuntimeStateProvider provider,
        CancellationToken ct)
    {
        return await provider.GetCurrentAsync(ct);
    }
}
