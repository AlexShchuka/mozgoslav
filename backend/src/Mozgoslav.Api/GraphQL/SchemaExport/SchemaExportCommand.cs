using System;
using System.IO;
using System.Threading.Tasks;

using HotChocolate.Execution;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Api.GraphQL.SchemaExport;

internal sealed class SchemaExportCommand
{
    private readonly IRequestExecutorResolver _executorResolver;

    internal SchemaExportCommand(IRequestExecutorResolver executorResolver)
    {
        _executorResolver = executorResolver;
    }

    internal static SchemaExportCommand Create(IServiceProvider services)
    {
        return new SchemaExportCommand(
            services.GetRequiredService<IRequestExecutorResolver>());
    }

    internal async Task RunAsync(string outputPath)
    {
        var executor = await _executorResolver.GetRequestExecutorAsync();
        var sdl = executor.Schema.Print();
        await File.WriteAllTextAsync(outputPath, sdl);
    }
}
