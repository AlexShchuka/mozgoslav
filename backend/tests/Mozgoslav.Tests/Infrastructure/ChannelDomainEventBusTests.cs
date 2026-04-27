using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Obsidian;
using Mozgoslav.Infrastructure.Obsidian;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class ChannelDomainEventBusTests
{
    [TestMethod]
    public async Task PublishAsync_WithSingleSubscriber_DeliversEvent()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await using var enumerator = bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token).GetAsyncEnumerator(cts.Token);
        var firstMove = enumerator.MoveNextAsync();

        var payload = new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow);
        await bus.PublishAsync(payload, cts.Token);

        (await firstMove).Should().BeTrue();
        enumerator.Current.Should().Be(payload);
    }

    [TestMethod]
    public async Task PublishAsync_WithMultipleSubscribers_FansOutToAll()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        await using var enumA = bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token).GetAsyncEnumerator(cts.Token);
        await using var enumB = bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token).GetAsyncEnumerator(cts.Token);
        var moveA = enumA.MoveNextAsync();
        var moveB = enumB.MoveNextAsync();

        var payload = new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow);
        await bus.PublishAsync(payload, cts.Token);

        (await moveA).Should().BeTrue();
        (await moveB).Should().BeTrue();
        enumA.Current.Should().Be(payload);
        enumB.Current.Should().Be(payload);
    }

    [TestMethod]
    public async Task SubscribeAsync_WhenCancelled_ExitsCleanly()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource();

        var consumer = Task.Run(async () =>
        {
            var collected = new List<ProcessedNoteSaved>();
            await foreach (var evt in bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token))
            {
                collected.Add(evt);
            }
            return collected;
        });

        await Task.Delay(50, CancellationToken.None);
        await cts.CancelAsync();
        var result = await consumer;
        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task PublishAsync_WithNoSubscribers_IsNoOp()
    {
        using var bus = new ChannelDomainEventBus();

        var act = async () => await bus.PublishAsync(
            new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task SubscribeAsync_TypeIsolated_DoesNotReceiveOtherEventTypes()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(2));

        await using var enumerator = bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token).GetAsyncEnumerator(cts.Token);
        var move = enumerator.MoveNextAsync();

        await bus.PublishAsync(new OtherEvent("ignored"), CancellationToken.None);
        await Task.Delay(100, CancellationToken.None);

        move.IsCompleted.Should().BeFalse();

        var payload = new ProcessedNoteSaved(Guid.NewGuid(), Guid.NewGuid(), DateTimeOffset.UtcNow);
        await bus.PublishAsync(payload, cts.Token);
        (await move).Should().BeTrue();
        enumerator.Current.Should().Be(payload);
    }

    private sealed record OtherEvent(string Name);
}
