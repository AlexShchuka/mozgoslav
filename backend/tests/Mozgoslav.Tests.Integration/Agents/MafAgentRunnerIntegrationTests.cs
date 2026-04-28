using System;
using System.Collections.Generic;
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

    private static MafAgentRunner BuildRunner(
        ILlmProvider provider,
        IReadOnlyList<IAgentTool>? tools = null)
    {
        var providerFactory = Substitute.For<ILlmProviderFactory>();
        providerFactory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(provider);
        return new MafAgentRunner(
            providerFactory,
            tools ?? [],
            NullLogger<MafAgentRunner>.Instance);
    }

    private static ILlmProvider BuildProvider(string response)
    {
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("stub");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(response);
        return provider;
    }

    [TestMethod]
    [Ignore("Requires a configured LLM endpoint")]
    public async Task RunAsync_WithRealLlmEndpoint_ReturnsNonEmptyAnswer()
    {
        var runner = BuildRunner(BuildProvider("Paris is the capital of France."));
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
        var runner = BuildRunner(BuildProvider("Stubbed answer from LLM."));
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
        var runner = BuildRunner(BuildProvider(string.Empty));
        var request = new AgentRunRequest(
            Prompt: "test",
            SystemPrompt: string.Empty,
            ToolNames: [],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.AgentsEnabled.Should().BeTrue();
        result.FinalAnswer.Should().BeEmpty();
    }

    [TestMethod]
    public async Task RunAsync_WithRegisteredTool_ToolCallDispatchedAndTraceCaptured()
    {
        var toolInvocations = new List<string>();
        var stubTool = Substitute.For<IAgentTool>();
        stubTool.Name.Returns("stub.tool");
        stubTool.Description.Returns("A stub tool for testing.");
        var toolOutput = System.Text.Json.JsonSerializer.Serialize(new { result = "tool output" });
        stubTool.InvokeAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                toolInvocations.Add(ci.Arg<string>());
                return Task.FromResult(toolOutput);
            });

        var toolCallText = "TOOL_CALL: stub.tool " + System.Text.Json.JsonSerializer.Serialize(new { input = "test" });
        var callCount = 0;
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("stub");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                callCount++;
                return callCount == 1
                    ? toolCallText
                    : "Final answer after tool.";
            });

        var runner = BuildRunner(provider, [stubTool]);
        var request = new AgentRunRequest(
            Prompt: "Use the stub tool and answer.",
            SystemPrompt: "You have tools available.",
            ToolNames: ["stub.tool"],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.AgentsEnabled.Should().BeTrue();
        result.FinalAnswer.Should().Be("Final answer after tool.");
        result.ToolCallTrace.Should().HaveCount(1);
        result.ToolCallTrace[0].Should().Contain("stub.tool");
        toolInvocations.Should().HaveCount(1);
    }

    [TestMethod]
    public async Task RunAsync_ToolNotInRegistry_SkipsDispatch()
    {
        var providerResponse = "TOOL_CALL: nonexistent.tool " + System.Text.Json.JsonSerializer.Serialize(new { x = 1 });
        var runner = BuildRunner(BuildProvider(providerResponse));
        var request = new AgentRunRequest(
            Prompt: "test",
            SystemPrompt: string.Empty,
            ToolNames: ["nonexistent.tool"],
            ModelHint: null);

        var result = await runner.RunAsync(request, CancellationToken.None);

        result.ToolCallTrace.Should().BeEmpty();
    }
}
