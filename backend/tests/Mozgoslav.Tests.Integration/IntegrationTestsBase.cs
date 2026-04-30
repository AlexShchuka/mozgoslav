using System.Net.Http;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Tests.Integration;

public abstract class IntegrationTestsBase
{
    public TestContext TestContext { get; set; } = null!;

    protected ApiFactory Factory { get; private set; } = null!;

    [TestInitialize]
    public void BaseInit() => Factory = new ApiFactory();

    [TestCleanup]
    public void BaseCleanup() => Factory.Dispose();

    protected HttpClient CreateClient() => Factory.CreateClient();

    protected T GetRequiredService<T>() where T : notnull
        => Factory.Services.GetRequiredService<T>();

    protected IServiceScope CreateScope() => Factory.Services.CreateScope();
}
