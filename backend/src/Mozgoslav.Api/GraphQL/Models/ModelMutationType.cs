using System.IO;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(MutationType))]
public sealed class ModelMutationType
{
    public async Task<DownloadModelPayload> DownloadModel(
        string catalogueId,
        [Service] IModelDownloadCoordinator coordinator,
        [Service] IDownloadJobRepository repo,
        [Service] Microsoft.Extensions.Hosting.IHostApplicationLifetime lifetime,
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
        if (File.Exists(destination))
        {
            return new DownloadModelPayload(null,
                [new ConflictError("ALREADY_INSTALLED", $"Model {catalogueId} is already installed")]);
        }

        var existing = await repo.TryGetActiveByCatalogueIdAsync(catalogueId, ct);
        if (existing is not null)
        {
            return new DownloadModelPayload(existing.Id.ToString("N"), []);
        }

        var downloadId = await coordinator.StartAsync(
            catalogueId,
            entry.Url,
            destination,
            null,
            lifetime.ApplicationStopping);

        return new DownloadModelPayload(downloadId, []);
    }

    public async Task<CancelModelDownloadPayload> CancelModelDownload(
        string downloadId,
        [Service] IModelDownloadCoordinator coordinator,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(downloadId))
        {
            return new CancelModelDownloadPayload(false,
                [new ValidationError("VALIDATION_ERROR", "downloadId is required", "downloadId")]);
        }

        var error = await coordinator.TryCancelAsync(downloadId, ct);

        if (error == "NOT_FOUND")
        {
            return new CancelModelDownloadPayload(false,
                [new NotFoundError("NOT_FOUND", $"Download {downloadId} not found", "DownloadJob", downloadId)]);
        }

        if (error == "CANNOT_CANCEL_FINALIZING")
        {
            return new CancelModelDownloadPayload(false,
                [new ConflictError("CANNOT_CANCEL_FINALIZING",
                    "Cannot cancel a download that is finalizing")]);
        }

        return new CancelModelDownloadPayload(true, []);
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = System.IO.Path.GetFileName(new System.Uri(entry.Url).AbsolutePath);
        return System.IO.Path.Combine(AppPaths.Models, fileName);
    }
}
