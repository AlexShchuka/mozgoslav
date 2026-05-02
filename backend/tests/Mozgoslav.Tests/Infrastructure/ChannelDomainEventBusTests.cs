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

    [TestMethod]
    public async Task WaitForSubscriberAsync_WhenSubscriberAlreadyRegistered_CompletesImmediately()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var enumerator = bus.SubscribeAsync<ProcessedNoteSaved>(cts.Token).GetAsyncEnumerator(cts.Token);
        var firstMove = enumerator.MoveNextAsync();

        await Task.Delay(50, CancellationToken.None);

        using var waitCts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));
        var waitTask = bus.WaitForSubscriberAsync<ProcessedNoteSaved>(waitCts.Token);
        var winner = await Task.WhenAny(waitTask, Task.Delay(TimeSpan.FromMilliseconds(200), CancellationToken.None));
        winner.Should().Be(waitTask, "subscriber was already registered so the wait should complete immediately");

        await cts.CancelAsync();
        try { await firstMove; } catch (OperationCanceledException) { }
        await enumerator.DisposeAsync();
    }

    [TestMethod]
    public async Task WaitForSubscriberAsync_WhenSubscriberRegistersLater_Completes()
    {
        using var bus = new ChannelDomainEventBus();
        using var waitCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var waitTask = bus.WaitForSubscriberAsync<ProcessedNoteSaved>(waitCts.Token);

        using var subCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        var enumerator = bus.SubscribeAsync<ProcessedNoteSaved>(subCts.Token).GetAsyncEnumerator(subCts.Token);
        var firstMove = enumerator.MoveNextAsync();

        var winner = await Task.WhenAny(waitTask, Task.Delay(TimeSpan.FromSeconds(2), CancellationToken.None));
        winner.Should().Be(waitTask, "wait should complete once a subscriber is registered");

        await subCts.CancelAsync();
        try { await firstMove; } catch (OperationCanceledException) { }
        await enumerator.DisposeAsync();
    }

    [TestMethod]
    public async Task WaitForSubscriberAsync_WhenCancelled_Throws()
    {
        using var bus = new ChannelDomainEventBus();
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        var act = async () => await bus.WaitForSubscriberAsync<ProcessedNoteSaved>(cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    private sealed record OtherEvent(string Name);
}
