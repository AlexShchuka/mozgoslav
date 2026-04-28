using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Rag;

using NSubstitute;

namespace Mozgoslav.Tests.Rag;

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

    [TestMethod]
    public async Task AnswerAsync_WithMetadataFilter_PassesFilterToRetriever()
    {
        var retriever = Substitute.For<IRetriever>();
        retriever.RetrieveAsync(Arg.Any<RetrievalQuery>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<RetrievedChunk>());
        var reranker = Substitute.For<IReranker>();
        var llm = Substitute.For<ILlmService>();
        var embedding = Substitute.For<IEmbeddingService>();
        var index = Substitute.For<IVectorIndex>();
        var sut = new RagService(embedding, index, retriever, reranker, llm, NullLogger<RagService>.Instance);

        var filter = new MetadataFilter(
            FromUtc: DateTimeOffset.UtcNow.AddDays(-7),
            ToUtc: DateTimeOffset.UtcNow,
            ProfileIds: null,
            SpeakerIds: null);

        await sut.AnswerAsync("test question", topK: 5, filter, CancellationToken.None);

        await retriever.Received(1).RetrieveAsync(
            Arg.Is<RetrievalQuery>(q => q.Filter == filter),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task AnswerAsync_LegacyOverload_PassesNullFilter()
    {
        var retriever = Substitute.For<IRetriever>();
        retriever.RetrieveAsync(Arg.Any<RetrievalQuery>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<RetrievedChunk>());
        var reranker = Substitute.For<IReranker>();
        var llm = Substitute.For<ILlmService>();
        var embedding = Substitute.For<IEmbeddingService>();
        var index = Substitute.For<IVectorIndex>();
        var sut = new RagService(embedding, index, retriever, reranker, llm, NullLogger<RagService>.Instance);

        await sut.AnswerAsync("test question", topK: 5, CancellationToken.None);

        await retriever.Received(1).RetrieveAsync(
            Arg.Is<RetrievalQuery>(q => q.Filter == null),
            Arg.Any<CancellationToken>());
    }

    private sealed class PassthroughRetriever : IRetriever
    {
        private readonly IEmbeddingService _embedding;
        private readonly IVectorIndex _index;

        public PassthroughRetriever(IEmbeddingService embedding, IVectorIndex index)
        {
            _embedding = embedding;
            _index = index;
        }

        public async Task<IReadOnlyList<RetrievedChunk>> RetrieveAsync(
            RetrievalQuery query,
            CancellationToken ct)
        {
            var vec = await _embedding.EmbedAsync(query.Query, ct);
            var hits = await _index.SearchAsync(vec, query.TopK, ct);
            return hits.Select(h => new RetrievedChunk(
                ChunkId: h.Chunk.Id,
                NoteId: h.Chunk.NoteId.ToString("D"),
                Text: h.Chunk.Text,
                Embedding: h.Chunk.Embedding,
                CreatedAt: DateTimeOffset.UtcNow,
                ProfileId: null,
                Speaker: null,
                Score: h.Score)).ToArray();
        }
    }

    private sealed class PassthroughReranker : IReranker
    {
        public Task<IReadOnlyList<RerankedChunk>> RerankAsync(
            string query,
            IReadOnlyList<RetrievedChunk> chunks,
            int topK,
            CancellationToken ct)
        {
            IReadOnlyList<RerankedChunk> result = chunks
                .Take(topK)
                .Select(c => new RerankedChunk(c, c.Score))
                .ToArray();
            return Task.FromResult(result);
        }
    }

    private sealed class Fixture
    {
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public InMemoryVectorIndex Index { get; } = new();
        public IEmbeddingService Embedding { get; } = new FakeEmbeddingService();
        public RagService Rag { get; }

        private Fixture()
        {
            var retriever = new PassthroughRetriever(Embedding, Index);
            var reranker = new PassthroughReranker();
            Rag = new RagService(Embedding, Index, retriever, reranker, Llm, NullLogger<RagService>.Instance);
        }

        public static Fixture Empty() => new();

        public static async Task<Fixture> Seed()
        {
            var f = new Fixture();
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

    private sealed class FakeEmbeddingService : IEmbeddingService
    {
        public int Dimensions => 128;

        public Task<float[]> EmbedAsync(string text, CancellationToken ct)
        {
            var bow = new FnvHashEmbeddingService(dimensions: 128);
            return bow.EmbedAsync(text, ct);
        }

        private sealed class FnvHashEmbeddingService : IEmbeddingService
        {
            private static readonly char[] Delimiters = [
                ' ', '\t', '\r', '\n', '.', ',', ';', ':', '!', '?',
            ];

            public FnvHashEmbeddingService(int dimensions)
            {
                Dimensions = dimensions;
            }

            public int Dimensions { get; }

            public Task<float[]> EmbedAsync(string text, CancellationToken ct)
            {
                var vector = new float[Dimensions];
                if (string.IsNullOrWhiteSpace(text))
                {
                    return Task.FromResult(vector);
                }
                var tokens = text.ToLowerInvariant().Split(Delimiters, StringSplitOptions.RemoveEmptyEntries);
                foreach (var token in tokens)
                {
                    if (token.Length < 2)
                    {
                        continue;
                    }
                    var bucket = (int)((uint)StableHash(token) % (uint)Dimensions);
                    vector[bucket] += 1f;
                }
                Normalize(vector);
                return Task.FromResult(vector);
            }

            private static void Normalize(float[] vector)
            {
                double sumSq = 0;
                foreach (var v in vector)
                {
                    sumSq += v * v;
                }
                if (sumSq == 0)
                {
                    return;
                }
                var norm = (float)Math.Sqrt(sumSq);
                for (var i = 0; i < vector.Length; i++)
                {
                    vector[i] /= norm;
                }
            }

            private static int StableHash(string s)
            {
                const uint FnvOffsetBasis = 2166136261u;
                const uint FnvPrime = 16777619u;
                var hash = FnvOffsetBasis;
                foreach (var c in s)
                {
                    hash ^= c;
                    hash *= FnvPrime;
                }
                return unchecked((int)hash);
            }
        }
    }
}
