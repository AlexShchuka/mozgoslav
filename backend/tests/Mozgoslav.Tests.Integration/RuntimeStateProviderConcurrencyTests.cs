using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using HotChocolate.Subscriptions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Api.GraphQL.Monitoring;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;
using Mozgoslav.Infrastructure.Monitoring;

using NSubstitute;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class RuntimeStateProviderConcurrencyTests
{
    [TestMethod]
    public async Task ReprobeAsync_ParallelCalls_DoNotThrowOrDeadlock()
    {
        var cache = Substitute.For<ILlmCapabilitiesCache>();
        var probe = Substitute.For<ILlmCapabilitiesProbe>();
        var settings = Substitute.For<IAppSettings>();
        var eventSender = Substitute.For<ITopicEventSender>();

        settings.LlmEndpoint.Returns("http://localhost:1234");
        settings.LlmModel.Returns("test-model");
        settings.LlmApiKey.Returns(string.Empty);

        var callCount = 0;
        probe.ProbeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                var n = Interlocked.Increment(ref callCount);
                if (n % 2 == 0)
                {
                    throw new InvalidOperationException("simulated failure");
                }
                return new LlmCapabilities(
                    SupportsToolCalling: true,
                    SupportsJsonMode: false,
                    CtxLength: 4096,
                    TokensPerSecond: 0,
                    ProbedAt: DateTimeOffset.UtcNow);
            });

        cache.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = new RuntimeStateProvider(
            cache,
            probe,
            settings,
            new SyncthingDetectionService(),
            eventSender,
            NullLogger<RuntimeStateProvider>.Instance);

        const int parallelCalls = 100;
        var tasks = Enumerable.Range(0, parallelCalls)
            .Select(_ => provider.ReprobeAsync(CancellationToken.None));

        var results = await Task.WhenAll(tasks);

        results.Should().HaveCount(parallelCalls);
        results.Should().AllSatisfy(r => r.Should().NotBeNull());
    }

    [TestMethod]
    public async Task ReprobeAsync_WhenGoingOnlineAndOffline_LlmStateLock_NeverDeadlocks()
    {
        var cache = Substitute.For<ILlmCapabilitiesCache>();
        var probe = Substitute.For<ILlmCapabilitiesProbe>();
        var settings = Substitute.For<IAppSettings>();
        var eventSender = Substitute.For<ITopicEventSender>();

        settings.LlmEndpoint.Returns("http://localhost:1234");
        settings.LlmModel.Returns("test-model");
        settings.LlmApiKey.Returns(string.Empty);

        var toggle = 0;
        probe.ProbeAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                var n = Interlocked.Increment(ref toggle);
                if (n % 3 != 0)
                {
                    return new LlmCapabilities(
                        SupportsToolCalling: false,
                        SupportsJsonMode: false,
                        CtxLength: 4096,
                        TokensPerSecond: 0,
                        ProbedAt: DateTimeOffset.UtcNow);
                }
                throw new InvalidOperationException("offline");
            });

        cache.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = new RuntimeStateProvider(
            cache,
            probe,
            settings,
            new SyncthingDetectionService(),
            eventSender,
            NullLogger<RuntimeStateProvider>.Instance);

        var tasks = Enumerable.Range(0, 50)
            .Select(_ => provider.ReprobeAsync(CancellationToken.None));

        var act = async () => await Task.WhenAll(tasks);

        await act.Should().NotThrowAsync();
    }
}
