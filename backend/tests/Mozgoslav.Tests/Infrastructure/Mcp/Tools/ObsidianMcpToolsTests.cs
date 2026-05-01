using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Infrastructure.Mcp.Tools;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Mcp.Tools;

[TestClass]
public sealed class ObsidianMcpToolsTests
{
    private sealed class Fixture
    {
        public IVaultDriver VaultDriver { get; } = Substitute.For<IVaultDriver>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();

        public ObsidianMcpTools BuildSut() => new(VaultDriver, Settings);
    }

    [TestMethod]
    public async Task WriteAsync_CallsVaultDriver_ReturnsPath()
    {
        var fixture = new Fixture();
        var receipt = new VaultWriteReceipt("_inbox/note.md", "sha256abc", 100L, VaultWriteAction.Created);
        fixture.VaultDriver.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(receipt);
        var sut = fixture.BuildSut();

        var result = await sut.WriteAsync("_inbox/note.md", "# Hello", CancellationToken.None);

        result.Path.Should().Be("_inbox/note.md");
        await fixture.VaultDriver.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath == "_inbox/note.md" && w.Body == "# Hello"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ReadAsync_VaultPathBlank_ReturnsEmptyNotFound()
    {
        var fixture = new Fixture();
        fixture.Settings.VaultPath.Returns(string.Empty);
        var sut = fixture.BuildSut();

        var result = await sut.ReadAsync("_inbox/note.md", CancellationToken.None);

        result.Exists.Should().BeFalse();
        result.Content.Should().BeEmpty();
    }

    [TestMethod]
    public async Task ReadAsync_FileDoesNotExist_ReturnsNotFound()
    {
        var fixture = new Fixture();
        fixture.Settings.VaultPath.Returns(Path.GetTempPath());
        var sut = fixture.BuildSut();

        var result = await sut.ReadAsync("nonexistent-file-xyz-abc.md", CancellationToken.None);

        result.Exists.Should().BeFalse();
    }

    [TestMethod]
    public async Task ReadAsync_ExistingFile_ReturnsContent()
    {
        var fixture = new Fixture();
        var dir = Path.Combine(Path.GetTempPath(), $"obsidian-test-{System.Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        var filePath = Path.Combine(dir, "note.md");
        await File.WriteAllTextAsync(filePath, "# Test Content");
        fixture.Settings.VaultPath.Returns(dir);
        var sut = fixture.BuildSut();

        try
        {
            var result = await sut.ReadAsync("note.md", CancellationToken.None);

            result.Exists.Should().BeTrue();
            result.Content.Should().Be("# Test Content");
        }
        finally
        {
            Directory.Delete(dir, recursive: true);
        }
    }
}
