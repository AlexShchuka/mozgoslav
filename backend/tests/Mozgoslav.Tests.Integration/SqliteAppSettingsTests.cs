using FluentAssertions;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfAppSettingsTests
{
    [TestMethod]
    public async Task LoadAsync_EmptyDatabase_ReturnsDefaults()
    {
        await using var db = new TestDatabase();
        using var settings = new EfAppSettings(db.CreateFactory());

        var loaded = await settings.LoadAsync(CancellationToken.None);

        loaded.Should().BeEquivalentTo(AppSettingsDto.Defaults);
    }

    [TestMethod]
    public async Task SaveAsync_Roundtrips_AllFields_IncludingSecrets()
    {
        await using var db = new TestDatabase();
        using var settings = new EfAppSettings(db.CreateFactory());

        var dto = AppSettingsDto.Defaults with
        {
            VaultPath = "/tmp/vault",
            LlmEndpoint = "http://localhost:11434",
            LlmModel = "qwen2.5-14b",
            LlmApiKey = "secret-abc",
            ObsidianApiToken = "sk-xyz",
            Language = "en",
            ThemeMode = "dark",
            WhisperThreads = 12,
        };

        await settings.SaveAsync(dto, CancellationToken.None);

        using var fresh = new EfAppSettings(db.CreateFactory());
        var loaded = await fresh.LoadAsync(CancellationToken.None);

        loaded.Should().BeEquivalentTo(dto);
    }

    [TestMethod]
    public async Task SaveAsync_UpdatesInMemorySnapshot()
    {
        await using var db = new TestDatabase();
        using var settings = new EfAppSettings(db.CreateFactory());

        await settings.SaveAsync(AppSettingsDto.Defaults with { Language = "de" }, CancellationToken.None);

        settings.Language.Should().Be("de");
        settings.Snapshot.Language.Should().Be("de");
    }
}
