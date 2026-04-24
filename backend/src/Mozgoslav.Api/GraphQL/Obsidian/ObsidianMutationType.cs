using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Obsidian;

[ExtendObjectType(typeof(MutationType))]
public sealed class ObsidianMutationType
{
    public async Task<SetupObsidianPayload> SetupObsidian(
        string? vaultPath,
        [Service] ObsidianSetupService service,
        [Service] IAppSettings settings,
        CancellationToken ct)
    {
        var target = string.IsNullOrWhiteSpace(vaultPath) ? settings.VaultPath : vaultPath;
        if (string.IsNullOrWhiteSpace(target))
        {
            return new SetupObsidianPayload(null, [new ValidationError("VALIDATION", "Vault path is not configured", "vaultPath")]);
        }
        try
        {
            var report = await service.SetupAsync(target, ct);
            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                await settings.SaveAsync(settings.Snapshot with { VaultPath = target }, ct);
            }
            return new SetupObsidianPayload(
                new ObsidianSetupReport(report.VaultPath, report.CreatedPaths, report.SkippedPaths),
                []);
        }
        catch (Exception ex)
        {
            return new SetupObsidianPayload(null, [new ValidationError("SETUP_FAILED", ex.Message, "vaultPath")]);
        }
    }
}
