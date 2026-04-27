using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration.Obsidian;

[TestClass]
public sealed class AutoExportIntegrationTests : IntegrationTestsBase
{
    private string _vaultRoot = null!;

    [TestInitialize]
    public void InitVault()
    {
        _vaultRoot = Path.Combine(Path.GetTempPath(), $"mozgoslav-autoexport-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_vaultRoot);
    }

    [TestCleanup]
    public void CleanupVault()
    {
        try
        {
            if (Directory.Exists(_vaultRoot))
            {
                Directory.Delete(_vaultRoot, recursive: true);
            }
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    [TestMethod]
    public async Task ProcessedNoteSaved_WithObsidianEnabled_WritesNoteToVaultAndUpdatesFlag()
    {
        var settings = GetRequiredService<IAppSettings>();
        var snapshot = settings.Snapshot;
        await settings.SaveAsync(snapshot with { VaultPath = _vaultRoot, ObsidianFeatureEnabled = true }, CancellationToken.None);

        Profile profile;
        ProcessedNote note;
        using (var scope = CreateScope())
        {
            var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            profile = await profiles.AddAsync(new Profile
            {
                Name = "AutoExportTest",
                ExportFolder = "_inbox",
                SystemPrompt = "test"
            }, CancellationToken.None);
            note = await notes.AddAsync(new ProcessedNote
            {
                ProfileId = profile.Id,
                Topic = "Auto Export Smoke",
                MarkdownContent = "# Auto export\n\nbody",
                CreatedAt = new DateTime(2026, 04, 27, 0, 0, 0, DateTimeKind.Utc),
            }, CancellationToken.None);
        }

        var bus = GetRequiredService<IDomainEventBus>();
        await bus.PublishAsync(new ProcessedNoteSaved(note.Id, profile.Id, DateTimeOffset.UtcNow), CancellationToken.None);

        var expectedRelative = "_inbox/2026-04-27-Auto-Export-Smoke-AutoExportTest.md";
        var expectedAbsolute = Path.Combine(_vaultRoot, "_inbox", "2026-04-27-Auto-Export-Smoke-AutoExportTest.md");

        await WaitUntilAsync(() => File.Exists(expectedAbsolute), TimeSpan.FromSeconds(5));

        File.Exists(expectedAbsolute).Should().BeTrue();
        var content = await File.ReadAllTextAsync(expectedAbsolute, TestContext.CancellationToken);
        content.Should().Contain("# Auto export");

        await WaitUntilAsync(async () =>
        {
            using var scope = CreateScope();
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            var refreshed = await notes.GetByIdAsync(note.Id, CancellationToken.None);
            return refreshed?.ExportedToVault == true;
        }, TimeSpan.FromSeconds(5));

        using (var scope = CreateScope())
        {
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            var refreshed = await notes.GetByIdAsync(note.Id, CancellationToken.None);
            refreshed.Should().NotBeNull();
            refreshed.ExportedToVault.Should().BeTrue();
            refreshed.VaultPath.Should().Be(expectedRelative);
        }
    }

    private static async Task WaitUntilAsync(Func<bool> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (predicate())
            {
                return;
            }
            await Task.Delay(25, CancellationToken.None);
        }
    }

    private static async Task WaitUntilAsync(Func<Task<bool>> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (await predicate())
            {
                return;
            }
            await Task.Delay(25, CancellationToken.None);
        }
    }
}
