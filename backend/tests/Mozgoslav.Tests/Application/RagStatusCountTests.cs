using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class RagStatusCountTests
{
    [TestMethod]
    public async Task CountAsync_IsCalledInsteadOfGetAllAsync_WhenCheckingNoteCount()
    {
        var repo = Substitute.For<IProcessedNoteRepository>();
        repo.CountAsync(Arg.Any<CancellationToken>()).Returns(7);

        var count = await repo.CountAsync(CancellationToken.None);

        count.Should().Be(7);
        await repo.Received(1).CountAsync(Arg.Any<CancellationToken>());
        await repo.DidNotReceiveWithAnyArgs().GetAllAsync(default);
    }

    [TestMethod]
    public async Task CountAsync_ReturnsZero_WhenNoNotesExist()
    {
        var repo = Substitute.For<IProcessedNoteRepository>();
        repo.CountAsync(Arg.Any<CancellationToken>()).Returns(0);

        var count = await repo.CountAsync(CancellationToken.None);

        count.Should().Be(0);
    }

    [TestMethod]
    public async Task CountAsync_ReturnsCorrectCount_WhenNotesExist()
    {
        var repo = Substitute.For<IProcessedNoteRepository>();
        repo.CountAsync(Arg.Any<CancellationToken>()).Returns(42);

        var count = await repo.CountAsync(CancellationToken.None);

        count.Should().Be(42);
    }
}
