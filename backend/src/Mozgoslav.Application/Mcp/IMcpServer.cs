using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Mcp;

public interface IMcpServer
{
    IReadOnlyList<McpToolDescriptor> Tools { get; }
    Task StartAsync(CancellationToken ct);
    Task StopAsync(CancellationToken ct);
}
