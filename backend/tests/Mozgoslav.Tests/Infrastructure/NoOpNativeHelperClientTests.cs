using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class NoOpNativeHelperClientTests
{
    [TestMethod]
    public async Task RunShortcutAsync_returns_failure_with_platform_message()
    {
        var sut = new NoOpNativeHelperClient();

        var result = await sut.RunShortcutAsync("Test Shortcut", "", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }
}
