using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Settings;

[ExtendObjectType(typeof(QueryType))]
public sealed class SettingsQueryType
{
    public async Task<AppSettingsDto> Settings(
        [Service] IAppSettings appSettings,
        CancellationToken ct)
    {
        return await appSettings.LoadAsync(ct);
    }
}
