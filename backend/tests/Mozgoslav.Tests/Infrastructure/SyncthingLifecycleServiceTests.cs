using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-007-phase2-backend §2.3 BC-048 / BC-049 — lifecycle service contract.
/// These tests exercise the "no binary present" branch because the sandbox
/// pod ships without a syncthing binary. The real-spawn / real-shutdown path
/// is exercised by the Testcontainers integration tests (SyncStatusEndpoint).
/// </summary>
[TestClass]
public sealed class SyncthingLifecycleServiceTests
{
    [TestMethod]
    public async Task StartAsync_WhenSyncthingDisabled_LogsInfoAndNoOps()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.SyncthingEnabled.Returns(false);
        var logger = new ListLogger<SyncthingLifecycleService>();
        await using var sut = new SyncthingLifecycleService(settings, logger);

        await sut.StartAsync(CancellationToken.None);

        logger.Entries.Should().Contain(e =>
            e.Level == LogLevel.Information
            && e.Message.Contains("disabled", StringComparison.OrdinalIgnoreCase));
        logger.Entries.Should().NotContain(e =>
            e.Level == LogLevel.Warning || e.Level == LogLevel.Error);
    }

    [TestMethod]
    public async Task StartAsync_WhenBinaryMissing_LogsInfoAndNoOps()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.SyncthingEnabled.Returns(true);
        var logger = new ListLogger<SyncthingLifecycleService>();
        await using var sut = new SyncthingLifecycleService(settings, logger);

        var previous = Environment.GetEnvironmentVariable("MOZGOSLAV_SYNCTHING_BINARY");
        var previousLegacy = Environment.GetEnvironmentVariable("SYNCTHING_BINARY");
        Environment.SetEnvironmentVariable("MOZGOSLAV_SYNCTHING_BINARY", null);
        Environment.SetEnvironmentVariable("SYNCTHING_BINARY", null);

        try
        {
            await sut.StartAsync(CancellationToken.None);
        }
        finally
        {
            Environment.SetEnvironmentVariable("MOZGOSLAV_SYNCTHING_BINARY", previous);
            Environment.SetEnvironmentVariable("SYNCTHING_BINARY", previousLegacy);
        }

        logger.Entries.Should().NotContain(e => e.Level == LogLevel.Error);
        await sut.StopAsync(CancellationToken.None);
    }

    [TestMethod]
    public async Task StopAsync_WithoutStart_DoesNotThrow()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.SyncthingEnabled.Returns(true);
        var logger = NullLogger<SyncthingLifecycleService>.Instance;
        await using var sut = new SyncthingLifecycleService(settings, logger);

        await sut.Invoking(s => s.StopAsync(CancellationToken.None))
            .Should().NotThrowAsync();
    }

    private sealed class ListLogger<T> : ILogger<T>
    {
        public List<LogEntry> Entries { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Entries.Add(new LogEntry(logLevel, formatter(state, exception)));
        }
        public sealed record LogEntry(LogLevel Level, string Message);
    }
}
