using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Services;

namespace Mozgoslav.Tests.Application.Services;

[TestClass]
public sealed class JobCancellationRegistryTests
{
    [TestMethod]
    public void Register_NewJob_ReturnsCancellationTokenSource()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();

        using var cts = registry.Register(jobId, CancellationToken.None);

        cts.Should().NotBeNull();
        cts.IsCancellationRequested.Should().BeFalse();
    }

    [TestMethod]
    public void TryCancel_RegisteredJob_CancelsTokenAndReturnsTrue()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();
        using var cts = registry.Register(jobId, CancellationToken.None);

        var result = registry.TryCancel(jobId);

        result.Should().BeTrue();
        cts.IsCancellationRequested.Should().BeTrue();
    }

    [TestMethod]
    public void TryCancel_UnregisteredJob_ReturnsFalse()
    {
        var registry = new JobCancellationRegistry();

        var result = registry.TryCancel(Guid.NewGuid());

        result.Should().BeFalse();
    }

    [TestMethod]
    public void TryCancel_AlreadyCancelledToken_ReturnsTrueWithoutException()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();
        using var cts = registry.Register(jobId, CancellationToken.None);
        registry.TryCancel(jobId);

        var result = registry.TryCancel(jobId);

        result.Should().BeTrue();
    }

    [TestMethod]
    public void Unregister_AfterRegister_TokenNoLongerCancellable()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();
        using var registered = registry.Register(jobId, CancellationToken.None);
        registry.Unregister(jobId);

        var result = registry.TryCancel(jobId);

        result.Should().BeFalse();
    }

    [TestMethod]
    public void Unregister_UnknownJob_IsNoOp()
    {
        var registry = new JobCancellationRegistry();

        var act = () => registry.Unregister(Guid.NewGuid());

        act.Should().NotThrow();
    }

    [TestMethod]
    public void Register_SameIdTwice_ReturnsExistingSource()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();

        using var first = registry.Register(jobId, CancellationToken.None);
        using var second = registry.Register(jobId, CancellationToken.None);

        second.Should().BeSameAs(first);
    }

    [TestMethod]
    public void Register_LinkedToHostToken_CancelsWhenHostCancels()
    {
        var registry = new JobCancellationRegistry();
        var jobId = Guid.NewGuid();
        using var hostCts = new CancellationTokenSource();

        using var cts = registry.Register(jobId, hostCts.Token);
        hostCts.Cancel();

        cts.IsCancellationRequested.Should().BeTrue();
    }

    [TestMethod]
    public async Task TryCancel_ParallelCalls_NoConcurrencyErrors()
    {
        var registry = new JobCancellationRegistry();
        const int count = 100;
        var jobIds = new Guid[count];
        for (var i = 0; i < count; i++)
        {
            jobIds[i] = Guid.NewGuid();
        }

        var registerTasks = new List<Task>(count);
        for (var i = 0; i < count; i++)
        {
            var id = jobIds[i];
            registerTasks.Add(Task.Run(() => registry.Register(id, CancellationToken.None)));
        }
        await Task.WhenAll(registerTasks);

        var cancelTasks = new List<Task<bool>>(count);
        for (var i = 0; i < count; i++)
        {
            var id = jobIds[i];
            cancelTasks.Add(Task.Run(() => registry.TryCancel(id)));
        }
        var results = await Task.WhenAll(cancelTasks);

        results.Should().AllSatisfy(r => r.Should().BeTrue());
    }
}
