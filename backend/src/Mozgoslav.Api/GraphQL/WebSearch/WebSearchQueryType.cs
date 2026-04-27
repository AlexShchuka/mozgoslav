using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Infrastructure.WebSearch;

namespace Mozgoslav.Api.GraphQL.WebSearch;

[ExtendObjectType(typeof(QueryType))]
public sealed class WebSearchQueryType
{
    public async Task<WebSearchConfigDto> WebSearchConfig(
        [Service] SearxngConfigService configService,
        CancellationToken ct)
    {
        var engines = await configService.ReadEnginesAsync(ct);
        var raw = await configService.ReadRawYamlAsync(ct);

        return new WebSearchConfigDto(
            DdgEnabled: engines.DdgEnabled,
            YandexEnabled: engines.YandexEnabled,
            GoogleEnabled: engines.GoogleEnabled,
            CacheTtlHours: configService.CacheTtlHours,
            RawSettingsYaml: raw);
    }
}
