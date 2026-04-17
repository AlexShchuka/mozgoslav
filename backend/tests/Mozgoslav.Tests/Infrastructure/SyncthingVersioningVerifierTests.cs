using FluentAssertions;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Seed;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-004 R8: the verifier polls Syncthing until healthy, then compares the
/// reported versioning policy for each managed folder against the expected
/// one. Drift logs a warning; missing folders log info; a matching policy is
/// silent.
/// </summary>
[TestClass]
public sealed class SyncthingVersioningVerifierTests
{
    [TestMethod]
    public async Task ExecuteAsync_MatchingPolicy_NoWarning()
    {
        var client = Substitute.For<ISyncthingClient>();
        client.IsHealthyAsync(Arg.Any<CancellationToken>()).Returns(true);
        client.GetFolderVersioningsAsync(Arg.Any<CancellationToken>()).Returns(new Dictionary<string, FolderVersioning>
        {
            [SyncthingConfigService.RecordingsFolderId] = new("staggered", new Dictionary<string, string> { ["maxAge"] = "2592000" }),
            [SyncthingConfigService.NotesFolderId] = new("trashcan", new Dictionary<string, string> { ["cleanoutDays"] = "30" }),
            [SyncthingConfigService.VaultFolderId] = new("trashcan", new Dictionary<string, string> { ["cleanoutDays"] = "14" }),
        });
        var logger = new ListLogger<SyncthingVersioningVerifier>();
        using var verifier = new SyncthingVersioningVerifier(client, logger);

        await verifier.StartAsync(CancellationToken.None);
        await Task.Delay(50);
        await verifier.StopAsync(CancellationToken.None);

        logger.Entries.Should().NotContain(e => e.Level == LogLevel.Warning);
    }

    [TestMethod]
    public async Task ExecuteAsync_DriftedType_LogsWarning()
    {
        var client = Substitute.For<ISyncthingClient>();
        client.IsHealthyAsync(Arg.Any<CancellationToken>()).Returns(true);
        client.GetFolderVersioningsAsync(Arg.Any<CancellationToken>()).Returns(new Dictionary<string, FolderVersioning>
        {
            [SyncthingConfigService.RecordingsFolderId] = new("simple", new Dictionary<string, string> { ["keep"] = "5" }),
            [SyncthingConfigService.NotesFolderId] = new("trashcan", new Dictionary<string, string> { ["cleanoutDays"] = "30" }),
            [SyncthingConfigService.VaultFolderId] = new("trashcan", new Dictionary<string, string> { ["cleanoutDays"] = "14" }),
        });
        var logger = new ListLogger<SyncthingVersioningVerifier>();
        using var verifier = new SyncthingVersioningVerifier(client, logger);

        await verifier.StartAsync(CancellationToken.None);
        await Task.Delay(50);
        await verifier.StopAsync(CancellationToken.None);

        logger.Entries.Should().Contain(e =>
            e.Level == LogLevel.Warning && e.Message.Contains(SyncthingConfigService.RecordingsFolderId));
    }

    [TestMethod]
    public async Task ExecuteAsync_MissingFolder_LogsInfoNotWarning()
    {
        var client = Substitute.For<ISyncthingClient>();
        client.IsHealthyAsync(Arg.Any<CancellationToken>()).Returns(true);
        client.GetFolderVersioningsAsync(Arg.Any<CancellationToken>()).Returns(new Dictionary<string, FolderVersioning>());
        var logger = new ListLogger<SyncthingVersioningVerifier>();
        using var verifier = new SyncthingVersioningVerifier(client, logger);

        await verifier.StartAsync(CancellationToken.None);
        await Task.Delay(50);
        await verifier.StopAsync(CancellationToken.None);

        logger.Entries.Should().NotContain(e => e.Level == LogLevel.Warning);
        logger.Entries.Should().Contain(e => e.Level == LogLevel.Information);
    }

    [TestMethod]
    public async Task ExecuteAsync_ClientUnreachable_SwallowsHttpException()
    {
        var client = Substitute.For<ISyncthingClient>();
        client.IsHealthyAsync(Arg.Any<CancellationToken>()).Returns(true);
        client.GetFolderVersioningsAsync(Arg.Any<CancellationToken>())
            .Returns<Task<IReadOnlyDictionary<string, FolderVersioning>>>(_ => throw new HttpRequestException("down"));
        using var verifier = new SyncthingVersioningVerifier(client, NullLogger<SyncthingVersioningVerifier>.Instance);

        var act = async () =>
        {
            await verifier.StartAsync(CancellationToken.None);
            await Task.Delay(50);
            await verifier.StopAsync(CancellationToken.None);
        };

        await act.Should().NotThrowAsync();
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
