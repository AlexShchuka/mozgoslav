using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Agents;
using Mozgoslav.Infrastructure.Agents;

using NSubstitute;

namespace Mozgoslav.Tests.Agents;

[TestClass]
public sealed class AgentRunnerContractTests
{
    [TestMethod]
    public async Task RunAsync_NullRequest_ThrowsArgumentNullException()
    {
        var runner = new NoOpAgentRunner();

        var act = async () => await runner.RunAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task RunAsync_ValidRequest_ReturnsResult()
    {
        IAgentRunner runner = new NoOpAgentRunner();

        var request = new AgentRunRequest(
            Prompt: "What is the capital of France?",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.Should().NotBeNull();
        result.FinalAnswer.Should().NotBeNull();
        result.ToolCallTrace.Should().NotBeNull();
        result.Citations.Should().NotBeNull();
    }

    [TestMethod]
    public async Task RunAsync_CancellationRequested_PropagatesCancellation()
    {
        IAgentRunner runner = Substitute.For<IAgentRunner>();
        runner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns<AgentRunResult>(_ => throw new OperationCanceledException());

        var request = new AgentRunRequest(
            Prompt: "test",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var act = async () => await runner.RunAsync(request, CancellationToken.None);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }
}
