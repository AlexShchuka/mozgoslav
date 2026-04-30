using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Monitoring;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class RuntimeStateProviderTests
{
    [TestMethod]
    public async Task GetCurrentAsync_WhenCacheEmpty_ReturnsOfflineLlmState()
    {
        var provider = Substitute.For<IRuntimeStateProvider>();
        var expectedState = new RuntimeState(
            new LlmRuntimeState(
                Endpoint: "http://localhost:1234",
                Online: false,
                LastProbedAt: DateTime.MinValue,
                Model: string.Empty,
                ContextLength: 0,
                SupportsToolCalling: false,
                SupportsJsonMode: false,
                LastError: null),
            new SyncthingRuntimeState("not-installed", null, null, null, null),
            []);

        provider.GetCurrentAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(expectedState));

        var result = await provider.GetCurrentAsync(CancellationToken.None);

        result.Llm.Online.Should().BeFalse();
        result.Llm.ContextLength.Should().Be(0);
        result.Services.Should().BeEmpty();
    }

    [TestMethod]
    public async Task UpdateElectronServicesAsync_PropagatesServicesToState()
    {
        var provider = Substitute.For<IRuntimeStateProvider>();
        var services = new List<SupervisorServiceState>
        {
            new("backend", "healthy", null, 0, 12345, 5000)
        };

        var stateAfterUpdate = new RuntimeState(
            new LlmRuntimeState("http://localhost:1234", true, DateTime.UtcNow, "qwen2", 4096, false, false, null),
            new SyncthingRuntimeState("not-installed", null, null, null, null),
            services);

        provider.GetCurrentAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(stateAfterUpdate));

        await provider.UpdateElectronServicesAsync(services, CancellationToken.None);
        var result = await provider.GetCurrentAsync(CancellationToken.None);

        result.Services.Should().HaveCount(1);
        result.Services[0].Name.Should().Be("backend");
        result.Services[0].State.Should().Be("healthy");
    }

    [TestMethod]
    public async Task ReprobeAsync_WhenOnline_ReturnsOnlineLlmState()
    {
        var provider = Substitute.For<IRuntimeStateProvider>();
        var onlineState = new RuntimeState(
            new LlmRuntimeState(
                Endpoint: "http://localhost:1234",
                Online: true,
                LastProbedAt: DateTime.UtcNow,
                Model: "qwen2",
                ContextLength: 4096,
                SupportsToolCalling: true,
                SupportsJsonMode: false,
                LastError: null),
            new SyncthingRuntimeState("not-installed", null, null, null, null),
            []);

        provider.ReprobeAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(onlineState));

        var result = await provider.ReprobeAsync(CancellationToken.None);

        result.Llm.Online.Should().BeTrue();
        result.Llm.Model.Should().Be("qwen2");
        result.Llm.ContextLength.Should().Be(4096);
        result.Llm.LastError.Should().BeNull();
    }

    [TestMethod]
    public async Task ReprobeAsync_WhenOffline_ReturnsOfflineLlmStateWithError()
    {
        var provider = Substitute.For<IRuntimeStateProvider>();
        var offlineState = new RuntimeState(
            new LlmRuntimeState(
                Endpoint: "http://localhost:1234",
                Online: false,
                LastProbedAt: DateTime.MinValue,
                Model: string.Empty,
                ContextLength: 0,
                SupportsToolCalling: false,
                SupportsJsonMode: false,
                LastError: "Connection refused"),
            new SyncthingRuntimeState("not-installed", null, null, null, null),
            []);

        provider.ReprobeAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(offlineState));

        var result = await provider.ReprobeAsync(CancellationToken.None);

        result.Llm.Online.Should().BeFalse();
        result.Llm.LastError.Should().Be("Connection refused");
    }

    [TestMethod]
    public async Task ReprobeAsync_PublishesEventViaProvider()
    {
        var provider = Substitute.For<IRuntimeStateProvider>();
        var state = new RuntimeState(
            new LlmRuntimeState("http://localhost:1234", true, DateTime.UtcNow, "m", 0, false, false, null),
            new SyncthingRuntimeState("not-installed", null, null, null, null),
            []);

        provider.ReprobeAsync(Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(state));

        await provider.ReprobeAsync(CancellationToken.None);

        await provider.Received(1).ReprobeAsync(Arg.Any<CancellationToken>());
    }
}
