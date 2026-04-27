using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Agents;

using NSubstitute;

namespace Mozgoslav.Tests.Integration.Agents;

[TestClass]
public sealed class MafAgentRunnerIntegrationTests : IDisposable
{
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }
        _disposed = true;
    }

    [TestMethod]
    [Ignore("Requires a configured LLM endpoint")]
    public async Task RunAsync_WithRealLlmEndpoint_ReturnsNonEmptyAnswer()
    {
        var providerFactory = Substitute.For<ILlmProviderFactory>();
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("stub");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("Paris is the capital of France.");
        providerFactory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(provider);

        var runner = new MafAgentRunner(providerFactory, NullLogger<MafAgentRunner>.Instance);
        var request = new AgentRunRequest(
            Prompt: "What is the capital of France?",
            SystemPrompt: "You are a helpful assistant.",
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.Should().NotBeNull();
        result.AgentsEnabled.Should().BeTrue();
        result.FinalAnswer.Should().NotBeNullOrWhiteSpace();
    }

    [TestMethod]
    public async Task RunAsync_WithStubProvider_ReturnsMafWrappedResponse()
    {
        var providerFactory = Substitute.For<ILlmProviderFactory>();
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("stub");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns("Stubbed answer from LLM.");
        providerFactory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(provider);

        var runner = new MafAgentRunner(providerFactory, NullLogger<MafAgentRunner>.Instance);
        var request = new AgentRunRequest(
            Prompt: "Give me a test answer",
            SystemPrompt: "Be brief.",
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.AgentsEnabled.Should().BeTrue();
        result.FinalAnswer.Should().Be("Stubbed answer from LLM.");
        result.ToolCallTrace.Should().BeEmpty();
        result.Citations.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RunAsync_WhenLlmProviderReturnsEmpty_FinalAnswerIsEmpty()
    {
        var providerFactory = Substitute.For<ILlmProviderFactory>();
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("stub");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(string.Empty);
        providerFactory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(provider);

        var runner = new MafAgentRunner(providerFactory, NullLogger<MafAgentRunner>.Instance);
        var request = new AgentRunRequest(
            Prompt: "test",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.AgentsEnabled.Should().BeTrue();
        result.FinalAnswer.Should().BeEmpty();
    }
}
