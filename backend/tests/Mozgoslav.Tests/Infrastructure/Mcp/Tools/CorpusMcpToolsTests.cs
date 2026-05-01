using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Rag;
using Mozgoslav.Infrastructure.Mcp.Tools;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Mcp.Tools;

[TestClass]
public sealed class CorpusMcpToolsTests
{
    private sealed class Fixture
    {
        public IRagService RagService { get; } = Substitute.For<IRagService>();

        public CorpusMcpTools BuildSut() => new(RagService);
    }

    [TestMethod]
    public async Task QueryAsync_ValidQuestion_ReturnsAnswer()
    {
        var fixture = new Fixture();
        NoteChunkHit[] citations =
        [
            new(new NoteChunk("c1", System.Guid.NewGuid(), "chunk text", []), 0.9)
        ];
        fixture.RagService.AnswerAsync("what is X?", 5, Arg.Any<CancellationToken>())
            .Returns(new RagAnswer("The answer", citations, true));

        var sut = fixture.BuildSut();
        var result = await sut.QueryAsync("what is X?", 5, CancellationToken.None);

        result.Answer.Should().Be("The answer");
        result.Citations.Should().HaveCount(1);
        result.Citations[0].Should().Be("chunk text");
    }

    [TestMethod]
    public async Task QueryAsync_TopKBelowMin_ClampsTo1()
    {
        var fixture = new Fixture();
        fixture.RagService.AnswerAsync(Arg.Any<string>(), 1, Arg.Any<CancellationToken>())
            .Returns(new RagAnswer("ok", [], false));

        var sut = fixture.BuildSut();
        await sut.QueryAsync("q", 0, CancellationToken.None);

        await fixture.RagService.Received(1).AnswerAsync("q", 1, Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task QueryAsync_TopKAboveMax_ClampsTo20()
    {
        var fixture = new Fixture();
        fixture.RagService.AnswerAsync(Arg.Any<string>(), 20, Arg.Any<CancellationToken>())
            .Returns(new RagAnswer("ok", [], false));

        var sut = fixture.BuildSut();
        await sut.QueryAsync("q", 99, CancellationToken.None);

        await fixture.RagService.Received(1).AnswerAsync("q", 20, Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task QueryAsync_NoCitations_ReturnsEmptyArray()
    {
        var fixture = new Fixture();
        fixture.RagService.AnswerAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(new RagAnswer("no citations", [], false));

        var sut = fixture.BuildSut();
        var result = await sut.QueryAsync("q", 5, CancellationToken.None);

        result.Citations.Should().BeEmpty();
    }
}
