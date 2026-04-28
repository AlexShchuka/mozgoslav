using System;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Agents;

namespace Mozgoslav.Infrastructure.Agents;

public sealed class NoOpAgentRunner : IAgentRunner
{
    private const string DisabledAnswer = "Agents are disabled. Enable them in settings to use this feature.";

    public Task<AgentRunResult> RunAsync(AgentRunRequest request, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(request);
        return Task.FromResult(new AgentRunResult(
            FinalAnswer: DisabledAnswer,
            ToolCallTrace: [],
            Citations: [],
            AgentsEnabled: false));
    }
}
