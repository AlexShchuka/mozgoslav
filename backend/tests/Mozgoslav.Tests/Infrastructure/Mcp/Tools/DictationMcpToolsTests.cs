using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Mcp.Tools;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Mozgoslav.Tests.Infrastructure.Mcp.Tools;

[TestClass]
public sealed class DictationMcpToolsTests
{
    private sealed class Fixture
    {
        public IDictationSessionManager Manager { get; } = Substitute.For<IDictationSessionManager>();

        public DictationMcpTools BuildSut() => new(Manager);
    }

    [TestMethod]
    public void Start_ReturnsSessionId()
    {
        var fixture = new Fixture();
        var session = new DictationSession { Id = Guid.NewGuid() };
        fixture.Manager.Start(Arg.Any<string?>(), Arg.Any<Mozgoslav.Domain.Enums.DictationSessionKind>(), Arg.Any<Guid?>())
            .Returns(session);
        var sut = fixture.BuildSut();

        var result = sut.Start();

        result.SessionId.Should().Be(session.Id.ToString());
    }

    [TestMethod]
    public async Task StopAsync_InvalidSessionId_ReturnsFailure()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.StopAsync("not-a-guid", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public async Task StopAsync_ValidSessionId_ReturnsTranscript()
    {
        var fixture = new Fixture();
        var sessionId = Guid.NewGuid();
        var final = new FinalTranscript("raw text", "polished text", TimeSpan.FromSeconds(5));
        fixture.Manager.StopAsync(sessionId, Arg.Any<CancellationToken>(), Arg.Any<string?>())
            .Returns(final);
        var sut = fixture.BuildSut();

        var result = await sut.StopAsync(sessionId.ToString(), CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Transcript.Should().Be("polished text");
        result.Error.Should().BeNull();
    }

    [TestMethod]
    public async Task StopAsync_ManagerThrows_ReturnsFailure()
    {
        var fixture = new Fixture();
        var sessionId = Guid.NewGuid();
        fixture.Manager.StopAsync(sessionId, Arg.Any<CancellationToken>(), Arg.Any<string?>())
            .ThrowsAsync(new InvalidOperationException("session not found"));
        var sut = fixture.BuildSut();

        var result = await sut.StopAsync(sessionId.ToString(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().Contain("session not found");
    }

    [TestMethod]
    public async Task CancelAsync_InvalidSessionId_ReturnsFailure()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.CancelAsync("bad-id", CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public async Task CancelAsync_ValidSessionId_ReturnsSuccess()
    {
        var fixture = new Fixture();
        var sessionId = Guid.NewGuid();
        fixture.Manager.CancelAsync(sessionId, Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        var sut = fixture.BuildSut();

        var result = await sut.CancelAsync(sessionId.ToString(), CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Error.Should().BeNull();
    }
}
