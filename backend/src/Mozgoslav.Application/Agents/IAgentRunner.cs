using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Agents;

public interface IAgentRunner
{
    Task<AgentRunResult> RunAsync(AgentRunRequest request, CancellationToken ct);
}
