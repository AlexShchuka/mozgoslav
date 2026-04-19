using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// ADR-007-shared §2.6 BC-025 — materialises PARA-style scaffolding under
/// the configured vault root. Four folders are always produced —
/// <c>Projects</c>, <c>Areas</c>, <c>Resources</c>, <c>Archive</c> — plus
/// the auxiliary <c>Inbox</c> and <c>Templates</c> buckets the existing
/// <see cref="ObsidianSetupService"/> uses.
/// <para>
/// Idempotent: calling it twice creates zero new folders on the second run
/// (<see cref="ApplyLayoutResult.CreatedFolders"/> == 0). The operation is
/// filesystem-only today — the <c>movedNotes</c> counter stays at 0 until
/// <see cref="Domain.Entities.FolderMapping"/> + <see cref="Domain.Entities.VaultExportRule"/>
/// land in the repository layer (see <c>ADR-007-phase2-backend.md §2.2 Step 5</c>).
/// Returning 0 is the contract — frontend MR B shows a toast "0 notes moved"
/// which is accurate until the rule engine ships.
/// </para>
/// </summary>
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
