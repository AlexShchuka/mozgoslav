using FluentAssertions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

// IDISP001: the handles returned by AcquireAsync are owned by the cache —
// the caller is not supposed to dispose them. We assert on them instead.
#pragma warning disable IDISP001

/// <summary>
/// ADR-004 R4 — cache that keeps a heavy disposable resource warm between
/// calls and drops it after an idle window. We test the load/reuse/unload
/// state machine by triggering <c>UnloadIfIdleAsync</c> directly (same code
/// path the idle timer fires) so we don't wait on wall-clock minutes.
///
/// Test list:
///  - AcquireAsync_FirstCall_CreatesInstance
///  - AcquireAsync_SecondCall_ReusesCachedInstance
///  - UnloadIfIdleAsync_AfterRelease_DisposesInstance
///  - UnloadIfIdleAsync_WhileInUse_KeepsInstanceAlive
///  - AcquireAsync_AfterUnload_CreatesFreshInstance
///  - DisposeAsync_DisposesCachedInstance
///  - AcquireAsync_AfterDispose_Throws
/// </summary>
[TestClass]
public sealed class IdleResourceCacheTests
{
    [TestMethod]
    public async Task AcquireAsync_FirstCall_CreatesInstance()
    {
        var created = 0;
        await using var cache = new IdleResourceCache<TrackedResource>(
            () => { created++; return new TrackedResource(); },
            () => TimeSpan.Zero);

        var first = await cache.AcquireAsync(CancellationToken.None);

        created.Should().Be(1);
        first.Should().NotBeNull();
        cache.IsLoaded.Should().BeTrue();

        await cache.ReleaseAsync();
    }

    [TestMethod]
    public async Task AcquireAsync_SecondCall_ReusesCachedInstance()
    {
        var created = 0;
        await using var cache = new IdleResourceCache<TrackedResource>(
            () => { created++; return new TrackedResource(); },
            () => TimeSpan.Zero);

        var first = await cache.AcquireAsync(CancellationToken.None);
        await cache.ReleaseAsync();
        var second = await cache.AcquireAsync(CancellationToken.None);

        created.Should().Be(1);
        second.Should().BeSameAs(first);

        await cache.ReleaseAsync();
    }

    [TestMethod]
    public async Task UnloadIfIdleAsync_AfterRelease_DisposesInstance()
    {
        await using var cache = new IdleResourceCache<TrackedResource>(
            () => new TrackedResource(),
            () => TimeSpan.FromMinutes(10));

        var instance = await cache.AcquireAsync(CancellationToken.None);
        await cache.ReleaseAsync();

        var unloaded = await cache.UnloadIfIdleAsync();

        unloaded.Should().BeTrue();
        cache.IsLoaded.Should().BeFalse();
        instance.Disposed.Should().BeTrue();
    }

    [TestMethod]
    public async Task UnloadIfIdleAsync_WhileInUse_KeepsInstanceAlive()
    {
        await using var cache = new IdleResourceCache<TrackedResource>(
            () => new TrackedResource(),
            () => TimeSpan.FromMinutes(10));

        var instance = await cache.AcquireAsync(CancellationToken.None);
        // Note: no ReleaseAsync — still in use.

        var unloaded = await cache.UnloadIfIdleAsync();

        unloaded.Should().BeFalse();
        cache.IsLoaded.Should().BeTrue();
        instance.Disposed.Should().BeFalse();

        await cache.ReleaseAsync();
    }

    [TestMethod]
    public async Task AcquireAsync_AfterUnload_CreatesFreshInstance()
    {
        var created = 0;
        await using var cache = new IdleResourceCache<TrackedResource>(
            () => { created++; return new TrackedResource(); },
            () => TimeSpan.FromMinutes(10));

        var first = await cache.AcquireAsync(CancellationToken.None);
        await cache.ReleaseAsync();
        await cache.UnloadIfIdleAsync();

        var second = await cache.AcquireAsync(CancellationToken.None);

        created.Should().Be(2);
        second.Should().NotBeSameAs(first);
        first.Disposed.Should().BeTrue();

        await cache.ReleaseAsync();
    }

    [TestMethod]
    public async Task DisposeAsync_DisposesCachedInstance()
    {
        TrackedResource instance;
        var cache = new IdleResourceCache<TrackedResource>(
            () => new TrackedResource(),
            () => TimeSpan.Zero);
        await using (cache)
        {
            instance = await cache.AcquireAsync(CancellationToken.None);
            await cache.ReleaseAsync();
        }

        instance.Disposed.Should().BeTrue();
    }

    [TestMethod]
    // Post-dispose usage is the scenario under test — suppress the analyzer.
#pragma warning disable IDISP016
    public async Task AcquireAsync_AfterDispose_Throws()
    {
        var cache = new IdleResourceCache<TrackedResource>(
            () => new TrackedResource(),
            () => TimeSpan.Zero);
        await cache.DisposeAsync();

        var act = async () => await cache.AcquireAsync(CancellationToken.None);

        await act.Should().ThrowAsync<ObjectDisposedException>();
    }
#pragma warning restore IDISP016

    private sealed class TrackedResource : IDisposable
    {
        public bool Disposed { get; private set; }
        public void Dispose() => Disposed = true;
    }
}
