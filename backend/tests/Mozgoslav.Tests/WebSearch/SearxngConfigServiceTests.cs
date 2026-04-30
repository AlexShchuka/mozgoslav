using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.WebSearch;

using NSubstitute;

namespace Mozgoslav.Tests.WebSearch;

[TestClass]
public sealed class SearxngConfigServiceTests
{
    private string _tempDir = string.Empty;

    [TestInitialize]
    public void Setup()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"mozgoslav-searxng-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);
    }

    [TestCleanup]
    public void Teardown()
    {
        if (Directory.Exists(_tempDir))
        {
            Directory.Delete(_tempDir, recursive: true);
        }
    }

    [TestMethod]
    public async Task WriteEnginesAsync_WritesEngineFlags_AndEmitsRestartEvent()
    {
        var bundledPath = Path.Combine(_tempDir, "bundled-settings.yml");
        await File.WriteAllTextAsync(bundledPath, BuildMinimalYaml());

        var appSettings = Substitute.For<IAppSettings>();
        appSettings.WebCacheTtlHours.Returns(24);

        var originalOut = Console.Out;
        using var captured = new StringWriter();
        Console.SetOut(captured);

        try
        {
            var service = CreateService(bundledPath, appSettings);
            await service.WriteEnginesAsync(
                ddgEnabled: true,
                yandexEnabled: false,
                googleEnabled: true,
                CancellationToken.None);
        }
        finally
        {
            Console.SetOut(originalOut);
        }

        var output = captured.ToString();
        output.Should().Contain("MOZGOSLAV_EVENT:searxng-restart");
    }

    [TestMethod]
    public async Task WriteEnginesAsync_UpdatesEngineDisabledFlag_InSettingsFile()
    {
        var bundledPath = Path.Combine(_tempDir, "bundled-settings.yml");
        await File.WriteAllTextAsync(bundledPath, BuildMinimalYaml());

        var appSettings = Substitute.For<IAppSettings>();
        appSettings.WebCacheTtlHours.Returns(24);

        var originalOut = Console.Out;
        Console.SetOut(TextWriter.Null);

        try
        {
            var service = CreateService(bundledPath, appSettings);
            await service.WriteEnginesAsync(
                ddgEnabled: true,
                yandexEnabled: false,
                googleEnabled: true,
                CancellationToken.None);

            var config = await service.ReadEnginesAsync(CancellationToken.None);
            config.DdgEnabled.Should().BeTrue();
            config.YandexEnabled.Should().BeFalse();
            config.GoogleEnabled.Should().BeTrue();
        }
        finally
        {
            Console.SetOut(originalOut);
        }
    }

    private SearxngConfigService CreateService(string bundledPath, IAppSettings appSettings)
    {
        var userPath = Path.Combine(_tempDir, "user-settings.yml");
        return new SearxngConfigService(
            bundledPath,
            userPath,
            appSettings,
            NullLogger<SearxngConfigService>.Instance);
    }

    private static string BuildMinimalYaml() => """
        use_default_settings: true

        engines:
          - name: duckduckgo
            engine: duckduckgo
            disabled: false

          - name: yandex
            engine: yandex
            disabled: false

          - name: google
            engine: google
            disabled: false
        """;
}
