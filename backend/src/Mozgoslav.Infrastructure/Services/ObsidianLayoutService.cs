using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class ObsidianLayoutService : IObsidianLayoutService
{
    private readonly IAppSettings _settings;
    private readonly ILogger<ObsidianLayoutService> _logger;

    private static readonly string[] ParaFolders =
    [
        "Projects",
        "Areas",
        "Resources",
        "Archive",
        "Inbox",
        "Templates",
    ];

    public ObsidianLayoutService(IAppSettings settings, ILogger<ObsidianLayoutService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public Task<ApplyLayoutResult> ApplyParaLayoutAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_settings.VaultPath))
        {
            throw new InvalidOperationException("Vault path is not configured");
        }

        var vaultRoot = _settings.VaultPath;
        Directory.CreateDirectory(vaultRoot);

        var created = 0;
        foreach (var folder in ParaFolders)
        {
            ct.ThrowIfCancellationRequested();
            var full = Path.Combine(vaultRoot, folder);
            if (!Directory.Exists(full))
            {
                Directory.CreateDirectory(full);
                created++;
            }
        }

        _logger.LogInformation(
            "PARA layout applied at {Vault}: created={Created}, moved=0",
            vaultRoot, created);

        return Task.FromResult(new ApplyLayoutResult(created, MovedNotes: 0));
    }
}
