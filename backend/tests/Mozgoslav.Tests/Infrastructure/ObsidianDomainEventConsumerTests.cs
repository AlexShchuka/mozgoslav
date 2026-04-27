using System;
using System.Collections;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Obsidian;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class ObsidianDomainEventConsumerTests
{
    [TestMethod]
    public async Task Handler_OnProcessedNoteSaved_WritesToVaultAndUpdatesNoteFlags()
    {
        var fixture = new Fixture();
        fixture.Settings.ObsidianFeatureEnabled.Returns(true);
        fixture.Settings.VaultPath.Returns("/tmp/vault");

        var noteId = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var note = new ProcessedNote
        {
            Id = noteId,
            ProfileId = profileId,
            Topic = "Daily Standup",
            MarkdownContent = "# body",
            CreatedAt = new DateTime(2026, 04, 27, 0, 0, 0, DateTimeKind.Utc)
        };
        var profile = new Profile { Id = profileId, Name = "Work", ExportFolder = "_inbox" };

        fixture.Notes.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);
        fixture.Profiles.GetByIdAsync(profileId, Arg.Any<CancellationToken>()).Returns(profile);
        fixture.Driver.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(ci => new VaultWriteReceipt(
                ci.ArgAt<VaultNoteWrite>(0).VaultRelativePath,
                "deadbeef", 6L, VaultWriteAction.Created));

        await using var harness = await HandlerHarness.StartAsync(fixture);

        await fixture.Bus.PublishAsync(new ProcessedNoteSaved(noteId, profileId, DateTimeOffset.UtcNow), CancellationToken.None);

        await WaitUntilAsync(
            () => note.ExportedToVault,
            TimeSpan.FromSeconds(5));

        note.ExportedToVault.Should().BeTrue();
        note.VaultPath.Should().Be("_inbox/2026-04-27-Daily-Standup-Work.md");
        await fixture.Driver.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath == "_inbox/2026-04-27-Daily-Standup-Work.md"),
            Arg.Any<CancellationToken>());
        await fixture.Notes.Received(1).UpdateAsync(note, Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task Handler_WhenObsidianDisabled_DoesNotWriteToVault()
    {
        var fixture = new Fixture();
        fixture.Settings.ObsidianFeatureEnabled.Returns(false);

        await using var harness = await HandlerHarness.StartAsync(fixture);

        await fixture.Bus.PublishAsync(
            new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow),
            CancellationToken.None);

        await Task.Delay(150, CancellationToken.None);

        await fixture.Driver.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
        await fixture.Notes.DidNotReceiveWithAnyArgs().UpdateAsync(default!, default);
    }

    [TestMethod]
    public async Task Handler_WhenVaultPathBlank_SkipsEnqueue()
    {
        var fixture = new Fixture();
        fixture.Settings.ObsidianFeatureEnabled.Returns(true);
        fixture.Settings.VaultPath.Returns(string.Empty);

        await using var harness = await HandlerHarness.StartAsync(fixture);

        await fixture.Bus.PublishAsync(
            new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow),
            CancellationToken.None);

        await Task.Delay(150, CancellationToken.None);

        await fixture.Driver.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
    }

    [TestMethod]
    public async Task Handler_WhenDriverThrows_LogsAndContinuesProcessing()
    {
        var fixture = new Fixture();
        fixture.Settings.ObsidianFeatureEnabled.Returns(true);
        fixture.Settings.VaultPath.Returns("/tmp/vault");

        var noteIdA = Guid.NewGuid();
        var noteIdB = Guid.NewGuid();
        var profileId = Guid.NewGuid();
        var noteA = new ProcessedNote
        {
            Id = noteIdA,
            ProfileId = profileId,
            Topic = "Bad",
            MarkdownContent = "a",
            CreatedAt = new DateTime(2026, 04, 27, 0, 0, 0, DateTimeKind.Utc)
        };
        var noteB = new ProcessedNote
        {
            Id = noteIdB,
            ProfileId = profileId,
            Topic = "Good",
            MarkdownContent = "b",
            CreatedAt = new DateTime(2026, 04, 27, 0, 0, 0, DateTimeKind.Utc)
        };
        var profile = new Profile { Id = profileId, Name = "Work", ExportFolder = "_inbox" };

        fixture.Notes.GetByIdAsync(noteIdA, Arg.Any<CancellationToken>()).Returns(noteA);
        fixture.Notes.GetByIdAsync(noteIdB, Arg.Any<CancellationToken>()).Returns(noteB);
        fixture.Profiles.GetByIdAsync(profileId, Arg.Any<CancellationToken>()).Returns(profile);

        var calls = 0;
        fixture.Driver.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                calls++;
                if (calls == 1)
                {
                    throw new InvalidOperationException("vault offline");
                }
                return Task.FromResult(new VaultWriteReceipt(
                    ci.ArgAt<VaultNoteWrite>(0).VaultRelativePath, "sha", 1L, VaultWriteAction.Created));
            });

        await using var harness = await HandlerHarness.StartAsync(fixture);

        await fixture.Bus.PublishAsync(new ProcessedNoteSaved(noteIdA, profileId, DateTimeOffset.UtcNow), CancellationToken.None);
        await fixture.Bus.PublishAsync(new ProcessedNoteSaved(noteIdB, profileId, DateTimeOffset.UtcNow), CancellationToken.None);

        await WaitUntilAsync(() => noteB.ExportedToVault, TimeSpan.FromSeconds(5));

        noteA.ExportedToVault.Should().BeFalse();
        noteB.ExportedToVault.Should().BeTrue();
        calls.Should().Be(2);
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
            await Task.Delay(20, CancellationToken.None);
        }
    }

    private sealed class Fixture
    {
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();
        public IProfileRepository Profiles { get; } = Substitute.For<IProfileRepository>();
        public IVaultDriver Driver { get; } = Substitute.For<IVaultDriver>();
        public ChannelDomainEventBus Bus { get; } = new();
    }

    private sealed class HandlerHarness : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;
        private readonly ObsidianDomainEventConsumer _handler;
        private readonly CancellationTokenSource _cts = new();

        private HandlerHarness(ServiceProvider provider, ObsidianDomainEventConsumer handler)
        {
            _provider = provider;
            _handler = handler;
        }

        public static async Task<HandlerHarness> StartAsync(Fixture fixture)
        {
            var services = new ServiceCollection();
            services.AddSingleton(fixture.Settings);
            services.AddSingleton(fixture.Notes);
            services.AddSingleton(fixture.Profiles);
            services.AddSingleton(fixture.Driver);
            var provider = services.BuildServiceProvider();
            var handler = new ObsidianDomainEventConsumer(
                fixture.Bus,
                provider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<ObsidianDomainEventConsumer>.Instance);
            var harness = new HandlerHarness(provider, handler);
            await handler.StartAsync(harness._cts.Token);
            await WaitUntilSubscribedAsync(fixture.Bus, TimeSpan.FromSeconds(5));
            return harness;
        }

        private static async Task WaitUntilSubscribedAsync(ChannelDomainEventBus bus, TimeSpan timeout)
        {
            var deadline = DateTime.UtcNow + timeout;
            while (DateTime.UtcNow < deadline)
            {
                if (CountSubscribers(bus) > 0)
                {
                    return;
                }
                await Task.Delay(10, CancellationToken.None);
            }
            throw new TimeoutException("Handler never registered a subscription on the bus");
        }

        private static int CountSubscribers(ChannelDomainEventBus bus)
        {
            var field = typeof(ChannelDomainEventBus)
                .GetField("_subscribers", BindingFlags.NonPublic | BindingFlags.Instance);
            var dict = field!.GetValue(bus);
            if (dict is not IEnumerable enumerable)
            {
                return 0;
            }
            var total = 0;
            foreach (var entry in enumerable)
            {
                var valueProp = entry!.GetType().GetProperty("Value");
                var inner = valueProp!.GetValue(entry);
                if (inner is null)
                {
                    continue;
                }
                var countProp = inner.GetType().GetProperty("Count");
                total += (int)countProp!.GetValue(inner)!;
            }
            return total;
        }

        public async ValueTask DisposeAsync()
        {
            await _cts.CancelAsync();
            await _handler.StopAsync(CancellationToken.None);
            _handler.Dispose();
            await _provider.DisposeAsync();
            _cts.Dispose();
        }
    }
}
