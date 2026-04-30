using System.Net;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Microsoft.AspNetCore.Http;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Monitoring;

namespace Mozgoslav.Api.GraphQL.Monitoring;

[ExtendObjectType(typeof(MutationType))]
public sealed class MonitoringMutationType
{
    public async Task<RuntimeStatePayload> ReprobeRuntimeState(
        [Service] IRuntimeStateProvider provider,
        CancellationToken ct)
    {
        var state = await provider.ReprobeAsync(ct);
        return new RuntimeStatePayload(state, []);
    }

    public async Task<RuntimeStatePayload> PublishElectronServices(
        PublishElectronServicesInput input,
        [Service] IRuntimeStateProvider provider,
        [Service] IHttpContextAccessor http,
        CancellationToken ct)
    {
        var remoteIp = http.HttpContext?.Connection.RemoteIpAddress;
        if (remoteIp is null || !IPAddress.IsLoopback(remoteIp))
        {
            return new RuntimeStatePayload(
                null,
                [new UnavailableError("LOOPBACK_ONLY", "publishElectronServices is only callable from loopback")]);
        }

        await provider.UpdateElectronServicesAsync(input.Services, ct);
        var state = await provider.GetCurrentAsync(ct);
        return new RuntimeStatePayload(state, []);
    }
}
