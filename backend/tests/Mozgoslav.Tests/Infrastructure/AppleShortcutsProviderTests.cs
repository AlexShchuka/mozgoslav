using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.SystemActions;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class AppleShortcutsProviderTests
{
    [TestMethod]
    public async Task InvokeAsync_forwards_name_and_input_to_helper()
    {
        var helper = Substitute.For<INativeHelperClient>();
        helper.RunShortcutAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new SystemActionResult(true, "done", null)));

        var sut = new AppleShortcutsProvider(helper, NullLogger<AppleShortcutsProvider>.Instance);

        var result = await sut.InvokeAsync(
            "Mozgoslav: Add reminder",
            new Dictionary<string, string> { ["input"] = "Buy milk" },
            CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Output.Should().Be("done");
        await helper.Received(1)
            .RunShortcutAsync("Mozgoslav: Add reminder", "Buy milk", Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task InvokeAsync_returns_failure_when_helper_fails()
    {
        var helper = Substitute.For<INativeHelperClient>();
        helper.RunShortcutAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new SystemActionResult(false, null, "permission denied")));

        var sut = new AppleShortcutsProvider(helper, NullLogger<AppleShortcutsProvider>.Instance);

        var result = await sut.InvokeAsync(
            "Mozgoslav: Add reminder",
            new Dictionary<string, string>(),
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Be("permission denied");
    }

    [TestMethod]
    public async Task InvokeAsync_uses_empty_input_when_args_missing()
    {
        var helper = Substitute.For<INativeHelperClient>();
        helper.RunShortcutAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(new SystemActionResult(true, null, null)));

        var sut = new AppleShortcutsProvider(helper, NullLogger<AppleShortcutsProvider>.Instance);

        await sut.InvokeAsync(
            "Mozgoslav: Add reminder",
            new Dictionary<string, string>(),
            CancellationToken.None);

        await helper.Received(1)
            .RunShortcutAsync("Mozgoslav: Add reminder", string.Empty, Arg.Any<CancellationToken>());
    }
}
