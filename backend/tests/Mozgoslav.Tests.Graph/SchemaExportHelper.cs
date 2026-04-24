using System.Threading.Tasks;

using HotChocolate.Execution;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Tests.Graph;

internal static class SchemaExportHelper
{
    internal static async Task<string> ExportSdlAsync(GraphApiFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var resolver = scope.ServiceProvider.GetRequiredService<IRequestExecutorResolver>();
        var executor = await resolver.GetRequestExecutorAsync();
        return executor.Schema.Print();
    }
}
