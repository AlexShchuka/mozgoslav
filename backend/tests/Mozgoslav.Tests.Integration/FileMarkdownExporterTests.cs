using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class FileMarkdownExporterTests : IDisposable
{
    private readonly string _vaultRoot;

    public FileMarkdownExporterTests()
    {
        _vaultRoot = Path.Combine(Path.GetTempPath(), $"mozgoslav-vault-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_vaultRoot);
    }

    public void Dispose()
    {
        try { Directory.Delete(_vaultRoot, recursive: true); } catch (IOException) { } catch (UnauthorizedAccessException) { }
    }

    [TestMethod]
    public async Task ExportAsync_WritesFileUnderProfileFolder()
    {
        var exporter = new FileMarkdownExporter(NullLogger<FileMarkdownExporter>.Instance);
        var profile = new Profile { Name = "Work", ExportFolder = "_inbox", CleanupLevel = CleanupLevel.Aggressive };
        var note = new ProcessedNote { Topic = "Q2 Planning", MarkdownContent = "# Q2\n\nbody", CreatedAt = new DateTime(2026, 04, 16) };

        var path = await exporter.ExportAsync(note, profile, _vaultRoot, CancellationToken.None);

        File.Exists(path).Should().BeTrue();
        path.Should().StartWith(Path.Combine(_vaultRoot, "_inbox"));
        var content = await File.ReadAllTextAsync(path, TestContext.CancellationToken);
        content.Should().Be("# Q2\n\nbody");
    }

    [TestMethod]
    public async Task ExportAsync_WhenFilenameCollides_AppendsNumericSuffix()
    {
        var exporter = new FileMarkdownExporter(NullLogger<FileMarkdownExporter>.Instance);
        var profile = new Profile { Name = "Work", ExportFolder = "_inbox" };
        var note = new ProcessedNote { Topic = "Same", MarkdownContent = "a", CreatedAt = new DateTime(2026, 04, 16) };

        var first = await exporter.ExportAsync(note, profile, _vaultRoot, CancellationToken.None);
        var second = await exporter.ExportAsync(note, profile, _vaultRoot, CancellationToken.None);

        first.Should().NotBe(second);
        File.Exists(first).Should().BeTrue();
        File.Exists(second).Should().BeTrue();
    }

    [TestMethod]
    public async Task ExportAsync_NullInputs_Throws()
    {
        var exporter = new FileMarkdownExporter(NullLogger<FileMarkdownExporter>.Instance);
        var profile = new Profile();
        var note = new ProcessedNote();

        await FluentActions.Invoking(() => exporter.ExportAsync(note, profile, "", CancellationToken.None))
            .Should().ThrowAsync<ArgumentException>();
    }

    public required TestContext TestContext { get; set; }
}
