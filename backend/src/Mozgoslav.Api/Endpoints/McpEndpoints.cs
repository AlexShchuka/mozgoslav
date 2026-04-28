using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Mozgoslav.Api.Endpoints;

public static class McpEndpoints
{
    public static IEndpointRouteBuilder MapMcpEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapMcp("/mcp");
        return endpoints;
    }
}
