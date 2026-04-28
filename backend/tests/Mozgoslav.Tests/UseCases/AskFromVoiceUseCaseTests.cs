using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Search;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Mozgoslav.Tests.UseCases;

[TestClass]
public sealed class AskFromVoiceUseCaseTests
{
    private static (
        IDictationSessionManager dictation,
        IUnifiedSearch search,
        IVaultDriver vault,
        IAppSettings settings,
        AskFromVoiceUseCase sut) Build()
    {
        var dictation = Substitute.For<IDictationSessionManager>();
        var search = Substitute.For<IUnifiedSearch>();
        var vault = Substitute.For<IVaultDriver>();
        var settings = Substitute.For<IAppSettings>();
        settings.LoadAsync(Arg.Any<CancellationToken>()).Returns(AppSettingsDto.Defaults);

        var sut = new AskFromVoiceUseCase(
            dictation, search, vault, settings, NullLogger<AskFromVoiceUseCase>.Instance);

        return (dictation, search, vault, settings, sut);
    }

    [TestMethod]
    public async Task ExecuteAsync_TranscribesAndSearches()
    {
        var (dictation, search, _, _, sut) = Build();
        var sessionId = Guid.NewGuid();
        dictation.StopAsync(sessionId, Arg.Any<CancellationToken>())
            .Returns(new FinalTranscript("raw", "polished", TimeSpan.FromSeconds(3)));

        search.AnswerAsync(Arg.Any<UnifiedSearchQuery>(), Arg.Any<CancellationToken>())
            .Returns(new UnifiedSearchResult("The answer", []));

        var result = await sut.ExecuteAsync(sessionId, archiveToVault: false, CancellationToken.None);

        result.Question.Should().Be("polished");
        result.Answer.Should().Be("The answer");
    }

    [TestMethod]
    public async Task ExecuteAsync_EmptyTranscript_ReturnsEmptyResult()
    {
        var (dictation, search, _, _, sut) = Build();
        var sessionId = Guid.NewGuid();
        dictation.StopAsync(sessionId, Arg.Any<CancellationToken>())
            .Returns(new FinalTranscript(string.Empty, string.Empty, TimeSpan.Zero));

        var result = await sut.ExecuteAsync(sessionId, archiveToVault: false, CancellationToken.None);

        result.Question.Should().BeEmpty();
        result.Answer.Should().BeEmpty();
        await search.DidNotReceive().AnswerAsync(Arg.Any<UnifiedSearchQuery>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_WhenArchiveToVaultTrue_WritesNoteToVault()
    {
        var (dictation, search, vault, _, sut) = Build();
        var sessionId = Guid.NewGuid();
        dictation.StopAsync(sessionId, Arg.Any<CancellationToken>())
            .Returns(new FinalTranscript("raw", "the question", TimeSpan.FromSeconds(2)));
        search.AnswerAsync(Arg.Any<UnifiedSearchQuery>(), Arg.Any<CancellationToken>())
            .Returns(new UnifiedSearchResult("the answer", []));
        vault.EnsureFolderAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(new VaultWriteReceipt("_inbox/queries/test.md", string.Empty, 0, VaultWriteAction.Created));

        var result = await sut.ExecuteAsync(sessionId, archiveToVault: true, CancellationToken.None);

        result.ArchivePath.Should().NotBeNull();
        await vault.Received(1).WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_WhenVaultWriteFails_ReturnsResultWithNullArchivePath()
    {
        var (dictation, search, vault, _, sut) = Build();
        var sessionId = Guid.NewGuid();
        dictation.StopAsync(sessionId, Arg.Any<CancellationToken>())
            .Returns(new FinalTranscript("raw", "question", TimeSpan.FromSeconds(1)));
        search.AnswerAsync(Arg.Any<UnifiedSearchQuery>(), Arg.Any<CancellationToken>())
            .Returns(new UnifiedSearchResult("answer", []));
        vault.EnsureFolderAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("vault offline"));

        var result = await sut.ExecuteAsync(sessionId, archiveToVault: true, CancellationToken.None);

        result.ArchivePath.Should().BeNull();
        result.Answer.Should().Be("answer");
    }
}
