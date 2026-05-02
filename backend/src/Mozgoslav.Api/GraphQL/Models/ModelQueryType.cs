using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(QueryType))]
public sealed class ModelQueryType
{
    public IReadOnlyList<ModelEntry> Models()
    {
        return ModelCatalog.All.Select(m =>
        {
            var destinationPath = ResolveDestination(m);
            return new ModelEntry(
                m.Id,
                m.Name,
                m.Description,
                m.Url,
                m.SizeMb,
                m.Kind,
                m.Tier,
                m.IsDefault,
                destinationPath,
                Installed: File.Exists(destinationPath));
        }).ToList();
    }

    public async Task<IReadOnlyList<ActiveDownloadDto>> ActiveDownloads(
        [Service] IModelDownloadCoordinator coordinator,
        CancellationToken ct)
    {
        var snapshots = await coordinator.ListActiveAsync(ct);
        return snapshots.Select(s => new ActiveDownloadDto(
            s.Id,
            s.CatalogueId,
            s.State,
            s.BytesReceived,
            s.TotalBytes,
            s.SpeedBytesPerSecond,
            s.ErrorMessage,
            s.StartedAt)).ToList();
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = System.IO.Path.GetFileName(new System.Uri(entry.Url).AbsolutePath);
        return System.IO.Path.Combine(AppPaths.Models, fileName);
    }
}
