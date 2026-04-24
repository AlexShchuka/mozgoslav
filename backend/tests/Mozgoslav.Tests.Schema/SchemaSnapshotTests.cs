using System.Threading.Tasks;

using HotChocolate.Execution;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

using Snapshooter.MSTest;

namespace Mozgoslav.Tests.Schema;

[TestClass]
public sealed class SchemaSnapshotTests
{
    [TestMethod]
    public async Task Schema_Matches_Snapshot()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var scope = factory.Services.CreateScope();

        var resolver = scope.ServiceProvider.GetRequiredService<IRequestExecutorResolver>();
        var executor = await resolver.GetRequestExecutorAsync();
        var sdl = executor.Schema.Print();

        sdl.MatchSnapshot();
    }
}
