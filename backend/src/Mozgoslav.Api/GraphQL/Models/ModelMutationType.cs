using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Subscriptions;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(MutationType))]
public sealed class ModelMutationType
{
    public async Task<DownloadModelPayload> DownloadModel(
        string catalogueId,
        [Service] IModelDownloadCoordinator coordinator,
        [Service] ITopicEventSender sender,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(catalogueId))
        {
            return new DownloadModelPayload(null,
                [new ValidationError("VALIDATION_ERROR", "catalogueId is required", "catalogueId")]);
        }

        var entry = ModelCatalog.TryGet(catalogueId);
        if (entry is null)
        {
            return new DownloadModelPayload(null,
                [new NotFoundError("NOT_FOUND", $"Unknown model: {catalogueId}", "ModelEntry", catalogueId)]);
        }

        var destination = ResolveDestination(entry);
        var downloadId = coordinator.Start(catalogueId, entry.Url, destination, ct);
        var topic = ModelDownloadTopics.ForDownloadId(downloadId);

        _ = Task.Run(async () =>
        {
            await foreach (var p in coordinator.StreamAsync(downloadId, CancellationToken.None))
            {
                var evt = new ModelDownloadProgressEvent(
                    p.DownloadId,
                    p.BytesRead,
                    p.TotalBytes,
                    p.Done,
                    p.Error);
                await sender.SendAsync(topic, evt, CancellationToken.None);
                if (p.Done)
                {
                    await sender.CompleteAsync(topic);
                    break;
                }
            }
        }, CancellationToken.None);

        return new DownloadModelPayload(downloadId, []);
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = System.IO.Path.GetFileName(new System.Uri(entry.Url).AbsolutePath);
        return System.IO.Path.Combine(AppPaths.Models, fileName);
    }
}
