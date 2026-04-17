using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Rag;

using NSubstitute;

namespace Mozgoslav.Tests.Rag;

/// <summary>
/// ADR-005 — RagService end-to-end with the real bag-of-words embedding +
/// in-memory index. Only the LLM port is faked, so we exercise chunking,
/// embedding, retrieval and the LLM-unavailable fallback path.
///
/// Test list:
///  - IndexAsync_Then_AnswerAsync_ReturnsRelevantCitations
///  - AnswerAsync_WhenLlmAvailable_UsesLlmAnswer
///  - AnswerAsync_WhenLlmUnavailable_FallsBackToCitationBundle
///  - AnswerAsync_EmptyIndex_ReturnsNoMatchesAnswer
///  - IndexAsync_ReindexingSameNote_ReplacesExistingChunks
///  - AnswerAsync_LlmThrows_FallsBackGracefully
/// </summary>
[TestClass]
public sealed class RagServiceTests
{
    [TestMethod]
    public async Task IndexAsync_Then_AnswerAsync_ReturnsRelevantCitations()
    {
        var fx = await Fixture.Seed();

        var answer = await fx.Rag.AnswerAsync(
            "Как я настроил синхронизацию Obsidian vault на телефон?",
            topK: 3,
            CancellationToken.None);

        answer.Citations.Should().NotBeEmpty();
        answer.Citations[0].Chunk.Text.Should().Contain("Obsidian");
    }

    [TestMethod]
    public async Task AnswerAsync_WhenLlmAvailable_UsesLlmAnswer()
    {
        var fx = await Fixture.Seed();
        fx.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fx.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "Paired via QR and shared the vault folder.",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: string.Empty,
                ConversationType: ConversationType.Other,
                Tags: []));

        var answer = await fx.Rag.AnswerAsync(
            "How did we set up mobile sync?", topK: 3, CancellationToken.None);

        answer.LlmAvailable.Should().BeTrue();
        answer.Answer.Should().Be("Paired via QR and shared the vault folder.");
    }

    [TestMethod]
    public async Task AnswerAsync_WhenLlmUnavailable_FallsBackToCitationBundle()
    {
        var fx = await Fixture.Seed();
        fx.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);

        var answer = await fx.Rag.AnswerAsync(
            "Obsidian sync", topK: 2, CancellationToken.None);

        answer.LlmAvailable.Should().BeFalse();
        answer.Citations.Should().NotBeEmpty();
        await fx.Llm.DidNotReceive().ProcessAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task AnswerAsync_EmptyIndex_ReturnsNoMatchesAnswer()
    {
        var fx = Fixture.Empty();

        var answer = await fx.Rag.AnswerAsync("anything", 3, CancellationToken.None);

        answer.Citations.Should().BeEmpty();
        answer.Answer.Should().Contain("не нашлось");
    }

    [TestMethod]
    public async Task IndexAsync_ReindexingSameNote_ReplacesExistingChunks()
    {
        var fx = Fixture.Empty();
        var note = new ProcessedNote
        {
            MarkdownContent = "Первая версия заметки про Syncthing.",
        };

        await fx.Rag.IndexAsync(note, CancellationToken.None);
        var firstCount = fx.Index.Count;

        var updated = new ProcessedNote
        {
            Id = note.Id,
            MarkdownContent = "Новая версия. Более длинная.\n\nС несколькими абзацами.",
        };
        await fx.Rag.IndexAsync(updated, CancellationToken.None);

        fx.Index.Count.Should().NotBe(firstCount);
        fx.Index.Count.Should().Be(2);
    }

    [TestMethod]
    public async Task AnswerAsync_LlmThrows_FallsBackGracefully()
    {
        var fx = await Fixture.Seed();
        fx.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fx.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<LlmProcessingResult>(_ => throw new HttpRequestException("endpoint down"));

        var answer = await fx.Rag.AnswerAsync(
            "Obsidian", topK: 2, CancellationToken.None);

        answer.LlmAvailable.Should().BeTrue();
        answer.Citations.Should().NotBeEmpty();
        answer.Answer.Should().Contain(answer.Citations[0].Chunk.Text);
    }

    private sealed class Fixture
    {
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public InMemoryVectorIndex Index { get; } = new();
        public IEmbeddingService Embedding { get; } = new BagOfWordsEmbeddingService(dimensions: 128);
        public RagService Rag { get; }

        private Fixture()
        {
            Rag = new RagService(Embedding, Index, Llm, NullLogger<RagService>.Instance);
        }

        public static Fixture Empty() => new();

        public static async Task<Fixture> Seed()
        {
            var f = new Fixture();
            // Several seeded notes — RAG should find the Obsidian-sync one.
            var notes = new[]
            {
                MakeNote("Созвон по проекту. Обсудили ML-сайдкар и диаризацию спикеров."),
                MakeNote("Настроил синхронизацию Obsidian vault на телефон через Syncthing. Paired мобильник QR-кодом."),
                MakeNote("Идеи по UI оверлея диктовки: анимация записи, подсказка горячей клавиши."),
                MakeNote("Прочёл статью про векторные БД — sqlite-vss и sqlite-vec выглядят интересно."),
                MakeNote("Задачи на неделю: починить CI, написать доку, ревью PR #42."),
            };
            foreach (var n in notes)
            {
                await f.Rag.IndexAsync(n, CancellationToken.None);
            }
            return f;
        }

        private static ProcessedNote MakeNote(string markdown) => new() { MarkdownContent = markdown };
    }
}
