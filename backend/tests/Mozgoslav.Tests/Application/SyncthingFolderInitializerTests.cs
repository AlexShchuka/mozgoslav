using System;
using System.IO;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// ADR-003 D6 + ADR-004 R7: SyncthingFolderInitializer creates the three
/// data directories and seeds a shared <c>.stignore</c> in each. Tests use a
/// temp root so they never touch the real <c>~/Library/Application Support</c>.
/// </summary>
[TestClass]
public sealed class SyncthingFolderInitializerTests
{
    private string _tempRoot = null!;

    [TestInitialize]
    public void Setup()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"mozgoslav-sync-init-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempRoot);
    }

    [TestCleanup]
    public void Cleanup()
    {
        if (Directory.Exists(_tempRoot))
        {
            Directory.Delete(_tempRoot, recursive: true);
        }
    }

    [TestMethod]
    public void Initialize_CreatesAllThreeFolders()
    {
        var init = BuildInitializer();

        init.Initialize();

        Directory.Exists(Path.Combine(_tempRoot, "data", "recordings")).Should().BeTrue();
        Directory.Exists(Path.Combine(_tempRoot, "data", "notes")).Should().BeTrue();
        Directory.Exists(Path.Combine(_tempRoot, "vault")).Should().BeTrue();
    }

    [TestMethod]
    public void Initialize_WritesStignoreInEveryFolder()
    {
        var init = BuildInitializer();

        init.Initialize();

        foreach (var folder in new[]
        {
            Path.Combine(_tempRoot, "data", "recordings"),
            Path.Combine(_tempRoot, "data", "notes"),
            Path.Combine(_tempRoot, "vault"),
        })
        {
            var stignore = Path.Combine(folder, ".stignore");
            File.Exists(stignore).Should().BeTrue($"{folder} must have a .stignore");
            var text = File.ReadAllText(stignore);

            text.Should().Contain(".DS_Store");
            text.Should().Contain("*.partial");
            text.Should().Contain("*.tmp");
            text.Should().Contain(".obsidian/workspace");
            text.Should().Contain("node_modules/");
        }
    }

    [TestMethod]
    public void Initialize_IsIdempotent_DoesNotOverwriteUserEditedStignore()
    {
        var init = BuildInitializer();

        init.Initialize();

        var stignore = Path.Combine(_tempRoot, "data", "recordings", ".stignore");
        const string userContent = "# user-owned patterns\nmy-project/\n";
        File.WriteAllText(stignore, userContent);

        init.Initialize();

        File.ReadAllText(stignore).Should().Be(userContent,
            "SyncthingFolderInitializer must not clobber a user-edited .stignore");
    }

    [TestMethod]
    public void Initialize_SkipsVaultFolder_WhenVaultPathIsEmpty()
    {
        var init = new SyncthingFolderInitializer(
            recordingsPath: Path.Combine(_tempRoot, "data", "recordings"),
            notesPath: Path.Combine(_tempRoot, "data", "notes"),
            vaultPath: string.Empty,
            NullLogger<SyncthingFolderInitializer>.Instance);

        init.Initialize();

        Directory.Exists(Path.Combine(_tempRoot, "data", "recordings")).Should().BeTrue();
        Directory.Exists(Path.Combine(_tempRoot, "data", "notes")).Should().BeTrue();
        Directory.Exists(Path.Combine(_tempRoot, "vault")).Should().BeFalse();
    }

    private SyncthingFolderInitializer BuildInitializer() => new(
        recordingsPath: Path.Combine(_tempRoot, "data", "recordings"),
        notesPath: Path.Combine(_tempRoot, "data", "notes"),
        vaultPath: Path.Combine(_tempRoot, "vault"),
        NullLogger<SyncthingFolderInitializer>.Instance);
}
