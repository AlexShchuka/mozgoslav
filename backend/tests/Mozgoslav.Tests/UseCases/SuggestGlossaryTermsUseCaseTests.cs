using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;

using NSubstitute;

namespace Mozgoslav.Tests.UseCases;

[TestClass]
public sealed class SuggestGlossaryTermsUseCaseTests
{
    private static IProcessedNoteRepository NoteRepoWith(Guid profileId, params string[] bodies)
    {
        var repo = Substitute.For<IProcessedNoteRepository>();
        var notes = new List<ProcessedNote>();
        foreach (var body in bodies)
        {
            notes.Add(new ProcessedNote
            {
                ProfileId = profileId,
                CleanTranscript = body,
            });
        }
        repo.GetByProfileIdAsync(profileId, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<IReadOnlyList<ProcessedNote>>(notes));
        return repo;
    }

    private static IProfileRepository ProfileRepoWith(Profile profile)
    {
        var repo = Substitute.For<IProfileRepository>();
        repo.GetByIdAsync(profile.Id, Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Profile?>(profile));
        return repo;
    }

    [TestMethod]
    public async Task ExecuteAsync_TokenizesAndFiltersShortTokens()
    {
        var profileId = Guid.NewGuid();
        var noteRepo = NoteRepoWith(profileId, "The OpenAI team launched GPT models across enterprise");
        var profileRepo = ProfileRepoWith(new Profile { Id = profileId });
        var sut = new SuggestGlossaryTermsUseCase(noteRepo, profileRepo);

        var result = await sut.ExecuteAsync(profileId, "en", CancellationToken.None);

        result.Should().Contain("openai");
        result.Should().Contain("launched");
        result.Should().Contain("enterprise");
        result.Should().NotContain("the");
        result.Should().NotContain("gpt");
    }

    [TestMethod]
    public async Task ExecuteAsync_RemovesEnStopwords()
    {
        var profileId = Guid.NewGuid();
        var noteRepo = NoteRepoWith(profileId, "which that this from have been were they there their product");
        var profileRepo = ProfileRepoWith(new Profile { Id = profileId });
        var sut = new SuggestGlossaryTermsUseCase(noteRepo, profileRepo);

        var result = await sut.ExecuteAsync(profileId, "en", CancellationToken.None);

        result.Should().Contain("product");
        result.Should().NotContain("which");
        result.Should().NotContain("that");
        result.Should().NotContain("from");
    }

    [TestMethod]
    public async Task ExecuteAsync_TruncatesToTopTwenty()
    {
        var profileId = Guid.NewGuid();
        var words = string.Join(" ", Enumerable.Range(0, 50).Select(i => $"word{i:D4}"));
        var noteRepo = NoteRepoWith(profileId, words);
        var profileRepo = ProfileRepoWith(new Profile { Id = profileId });
        var sut = new SuggestGlossaryTermsUseCase(noteRepo, profileRepo);

        var result = await sut.ExecuteAsync(profileId, "en", CancellationToken.None);

        result.Should().HaveCount(20);
    }

    [TestMethod]
    public async Task ExecuteAsync_ExcludesExistingGlossaryTerms()
    {
        var profileId = Guid.NewGuid();
        var profile = new Profile
        {
            Id = profileId,
            GlossaryByLanguage = new() { ["en"] = ["openai", "enterprise"] },
        };
        var noteRepo = NoteRepoWith(profileId, "openai launched enterprise product solutions");
        var profileRepo = ProfileRepoWith(profile);
        var sut = new SuggestGlossaryTermsUseCase(noteRepo, profileRepo);

        var result = await sut.ExecuteAsync(profileId, "en", CancellationToken.None);

        result.Should().NotContain("openai");
        result.Should().NotContain("enterprise");
        result.Should().Contain("product");
        result.Should().Contain("launched");
        result.Should().Contain("solutions");
    }
}
