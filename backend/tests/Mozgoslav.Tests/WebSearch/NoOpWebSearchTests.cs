using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.WebSearch;

namespace Mozgoslav.Tests.WebSearch;

[TestClass]
public sealed class NoOpWebSearchTests
{
    [TestMethod]
    public async Task SearchAsync_ReturnsEmptyList()
    {
        var provider = new NoOpWebSearch();

        var results = await provider.SearchAsync("any query", 10, CancellationToken.None);

        results.Should().BeEmpty();
    }

    [TestMethod]
    public async Task SearchAsync_WithEmptyQuery_ReturnsEmptyList()
    {
        var provider = new NoOpWebSearch();

        var results = await provider.SearchAsync(string.Empty, 5, CancellationToken.None);

        results.Should().BeEmpty();
    }

    [TestMethod]
    public async Task SearchAsync_WithTopZero_ReturnsEmptyList()
    {
        var provider = new NoOpWebSearch();

        var results = await provider.SearchAsync("test", 0, CancellationToken.None);

        results.Should().BeEmpty();
    }
}
