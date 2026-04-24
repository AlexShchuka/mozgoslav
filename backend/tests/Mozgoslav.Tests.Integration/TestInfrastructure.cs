using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public static class TestInfrastructure
{
    private static ApiFactory? _factory;

    public static ApiFactory Factory =>
        _factory ?? throw new System.InvalidOperationException(
            "TestInfrastructure.Factory accessed before AssemblyInitialize ran");

    [AssemblyInitialize]
    [Timeout(60_000)]
    public static async Task AssemblyInitialize(TestContext context)
    {
        _ = context;
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
        }
        _factory = new ApiFactory();
        _ = _factory.Services;
    }

    [AssemblyCleanup]
    [Timeout(60_000)]
    public static async Task AssemblyCleanup()
    {
        if (_factory is not null)
        {
            await _factory.DisposeAsync();
            _factory = null;
        }
    }

    public static T GetRequiredService<T>() where T : notnull
        => Factory.Services.GetRequiredService<T>();
}
