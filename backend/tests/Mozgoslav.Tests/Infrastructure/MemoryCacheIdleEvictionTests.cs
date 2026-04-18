using FluentAssertions;

using Microsoft.Extensions.Caching.Memory;

namespace Mozgoslav.Tests.Infrastructure;

// The analyzers don't recognise that IMemoryCache takes ownership of entries
// added via Set/GetOrCreate — every factory allocation below is released
// deterministically by Remove (or cache Dispose), so IDISP001/CA2000 are
// false positives for this pattern.
#pragma warning disable IDISP001, CA2000

/// <summary>
/// ADR-011 step 2 — the homebrew <c>IdleResourceCache&lt;T&gt;</c> has been
/// replaced with <see cref="IMemoryCache"/> + <see cref="MemoryCacheEntryOptions.SlidingExpiration"/>
/// + post-eviction callback. These tests pin the library-level behaviours the
/// production code relies on:
///  - reading an entry returns the cached instance (sliding window);
///  - removal triggers the post-eviction callback;
///  - the callback can dispose the cached resource without racing the cache itself.
/// </summary>
[TestClass]
public sealed class MemoryCacheIdleEvictionTests
{
    [TestMethod]
    public void GetOrCreate_FirstCall_InvokesFactory()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var created = 0;

        var resource = cache.GetOrCreate("key", _ =>
        {
            created++;
            return new TrackedResource();
        });

        created.Should().Be(1);
        resource.Should().NotBeNull();
    }

    [TestMethod]
    public void GetOrCreate_SecondCall_ReusesCachedInstance()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var created = 0;

        var first = cache.GetOrCreate("key", _ =>
        {
            created++;
            return new TrackedResource();
        });
        var second = cache.GetOrCreate("key", _ =>
        {
            created++;
            return new TrackedResource();
        });

        created.Should().Be(1);
        second.Should().BeSameAs(first);
    }

    [TestMethod]
    public async Task Eviction_TriggersPostEvictionCallback_WithCachedResource()
    {
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var evictionSignal = new TaskCompletionSource<TrackedResource?>();
        var resource = new TrackedResource();

        cache.Set("key", resource, new MemoryCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(5),
        }.RegisterPostEvictionCallback((_, value, _, _) =>
        {
            evictionSignal.TrySetResult(value as TrackedResource);
        }));

        cache.Remove("key");

        var evicted = await evictionSignal.Task.WaitAsync(TimeSpan.FromSeconds(5));
        evicted.Should().NotBeNull();
        evicted.Should().BeSameAs(resource);
    }

    [TestMethod]
    public async Task PostEvictionCallback_DisposesResource()
    {
        // Production wiring: WhisperNetTranscriptionService registers a
        // PostEvictionCallback that Dispose()s the evicted WhisperFactory.
        // This test pins that pattern with a stand-in disposable.
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var resource = new TrackedResource();
        var disposedSignal = new TaskCompletionSource();

        cache.Set("key", resource, new MemoryCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(5),
        }.RegisterPostEvictionCallback((_, value, _, _) =>
        {
            if (value is IDisposable disposable)
            {
                disposable.Dispose();
            }
            disposedSignal.TrySetResult();
        }));

        cache.Remove("key");

        await disposedSignal.Task.WaitAsync(TimeSpan.FromSeconds(5));
        resource.Disposed.Should().BeTrue();
    }

    [TestMethod]
    public void SlidingExpiration_ReadResetsWindow_NotImmediateEviction()
    {
        // Sanity check: a read inside the sliding window keeps the entry.
        // (True wall-clock expiration is covered by IMemoryCache's own test suite;
        // we only verify that the read path itself does not evict.)
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var resource = new TrackedResource();

        cache.Set("key", resource, new MemoryCacheEntryOptions
        {
            SlidingExpiration = TimeSpan.FromMinutes(5),
        });

        var hit = cache.TryGetValue("key", out TrackedResource? found);

        hit.Should().BeTrue();
        found.Should().BeSameAs(resource);
        resource.Disposed.Should().BeFalse();
    }

    private sealed class TrackedResource : IDisposable
    {
        public bool Disposed { get; private set; }
        public void Dispose() => Disposed = true;
    }
}
