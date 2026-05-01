using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Prompts;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Prompts;

[TestClass]
public sealed class PromptDispatcherTests
{
    private sealed class Fixture
    {
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();

        public PromptDispatcher BuildSut() =>
            new(Settings, NullLogger<PromptDispatcher>.Instance);
    }

    [TestMethod]
    public async Task DispatchAsync_NullPrompt_ThrowsArgumentException()
    {
        var fixture = new Fixture();
        fixture.Settings.ClaudeCliPath.Returns(string.Empty);
        var sut = fixture.BuildSut();

        var act = async () => await sut.DispatchAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task DispatchAsync_WhitespacePrompt_ThrowsArgumentException()
    {
        var fixture = new Fixture();
        fixture.Settings.ClaudeCliPath.Returns(string.Empty);
        var sut = fixture.BuildSut();

        var act = async () => await sut.DispatchAsync("   ", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task DispatchAsync_NoCliPath_NonMac_DoesNotThrow()
    {
        var fixture = new Fixture();
        fixture.Settings.ClaudeCliPath.Returns(string.Empty);
        var sut = fixture.BuildSut();

        var act = async () => await sut.DispatchAsync("some prompt text", CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task DispatchAsync_CliPathNotFound_FallsBackGracefully()
    {
        var fixture = new Fixture();
        fixture.Settings.ClaudeCliPath.Returns("/nonexistent/path/to/claude");
        var sut = fixture.BuildSut();

        var act = async () => await sut.DispatchAsync("hello", CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}
