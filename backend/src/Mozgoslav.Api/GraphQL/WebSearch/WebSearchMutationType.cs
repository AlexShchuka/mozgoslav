using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Infrastructure.WebSearch;

namespace Mozgoslav.Api.GraphQL.WebSearch;

[ExtendObjectType(typeof(MutationType))]
public sealed class WebSearchMutationType
{
    public async Task<WebSearchConfigPayload> UpdateWebSearchConfig(
        WebSearchConfigInput input,
        [Service] SearxngConfigService configService,
        CancellationToken ct)
    {
        await configService.WriteEnginesAsync(
            input.DdgEnabled,
            input.YandexEnabled,
            input.GoogleEnabled,
            ct);

        var engines = await configService.ReadEnginesAsync(ct);
        var raw = await configService.ReadRawYamlAsync(ct);

        var dto = new WebSearchConfigDto(
            DdgEnabled: engines.DdgEnabled,
            YandexEnabled: engines.YandexEnabled,
            GoogleEnabled: engines.GoogleEnabled,
            CacheTtlHours: configService.CacheTtlHours,
            RawSettingsYaml: raw);

        return new WebSearchConfigPayload(dto, []);
    }
}
