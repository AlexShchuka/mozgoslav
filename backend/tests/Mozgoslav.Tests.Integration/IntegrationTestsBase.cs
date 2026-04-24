using System;
using System.Net.Http;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Tests.Integration;

public abstract class IntegrationTestsBase : IDisposable
{
    private ApiFactory _factory = null!;

    public TestContext TestContext { get; set; } = null!;

    protected ApiFactory Factory => _factory;

    [TestInitialize]
    public void BaseInit() => _factory = new ApiFactory();

    [TestCleanup]
    public void BaseCleanup() => _factory.Dispose();

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposing)
        {
            _factory?.Dispose();
        }
    }

    protected HttpClient CreateClient() => _factory.CreateClient();

    protected T GetRequiredService<T>() where T : notnull
        => _factory.Services.GetRequiredService<T>();

    protected IServiceScope CreateScope() => _factory.Services.CreateScope();
}
