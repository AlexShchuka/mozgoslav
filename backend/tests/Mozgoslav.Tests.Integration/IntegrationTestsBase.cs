using System.Net.Http;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Tests.Integration;

public abstract class IntegrationTestsBase
{
    public TestContext TestContext { get; set; } = null!;

    protected static ApiFactory Factory => TestInfrastructure.Factory;

    protected static HttpClient CreateClient() => Factory.CreateClient();

    protected static T GetRequiredService<T>() where T : notnull
        => TestInfrastructure.GetRequiredService<T>();

    protected static IServiceScope CreateScope() => Factory.Services.CreateScope();
}
