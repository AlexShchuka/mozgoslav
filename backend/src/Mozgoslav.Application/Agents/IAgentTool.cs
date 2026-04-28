using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Agents;

public interface IAgentTool
{
    string Name { get; }
    string Description { get; }
    Task<string> InvokeAsync(string argsJson, CancellationToken ct);
}
