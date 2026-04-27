using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Agents;
using Mozgoslav.Infrastructure.Agents;

namespace Mozgoslav.Tests.Agents;

[TestClass]
public sealed class NoOpAgentRunnerTests
{
    [TestMethod]
    public async Task RunAsync_ReturnsAgentsDisabledResult()
    {
        var runner = new NoOpAgentRunner();
        var request = new AgentRunRequest(
            Prompt: "Do something",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.AgentsEnabled.Should().BeFalse();
    }

    [TestMethod]
    public async Task RunAsync_FinalAnswerContainsDisabledMessage()
    {
        var runner = new NoOpAgentRunner();
        var request = new AgentRunRequest(
            Prompt: "Do something",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.FinalAnswer.Should().NotBeNullOrWhiteSpace();
        result.FinalAnswer.Should().Contain("disabled");
    }

    [TestMethod]
    public async Task RunAsync_ReturnsEmptyToolCallTrace()
    {
        var runner = new NoOpAgentRunner();
        var request = new AgentRunRequest(
            Prompt: "Do something",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.ToolCallTrace.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RunAsync_ReturnsEmptyCitations()
    {
        var runner = new NoOpAgentRunner();
        var request = new AgentRunRequest(
            Prompt: "Do something",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.Citations.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RunAsync_DifferentPrompts_AlwaysReturnsSameDisabledResult()
    {
        var runner = new NoOpAgentRunner();

        var result1 = await runner.RunAsync(
            new AgentRunRequest("prompt A", string.Empty, [], null),
            CancellationToken.None);

        var result2 = await runner.RunAsync(
            new AgentRunRequest("prompt B", string.Empty, [], null),
            CancellationToken.None);

        result1.AgentsEnabled.Should().BeFalse();
        result2.AgentsEnabled.Should().BeFalse();
        result1.FinalAnswer.Should().Be(result2.FinalAnswer);
    }
}
