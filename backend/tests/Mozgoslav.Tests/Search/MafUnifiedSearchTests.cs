using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Application.Search;
using Mozgoslav.Application.WebSearch;
using Mozgoslav.Infrastructure.Search;
using Mozgoslav.Infrastructure.Search.Tools;

using NSubstitute;
using NSubstitute.ExceptionExtensions;


namespace Mozgoslav.Tests.Search;

[TestClass]
public sealed class MafUnifiedSearchTests
{
    private static MafUnifiedSearch BuildSut(
        IAgentRunner agentRunner,
        IRetriever? retriever = null,
        IReranker? reranker = null,
        IWebSearch? webSearch = null,
        IWebContentExtractor? webExtractor = null,
        IAppSettings? appSettings = null,
        bool defaultIncludeWeb = false)
    {
        retriever ??= Substitute.For<IRetriever>();
        reranker ??= Substitute.For<IReranker>();
        webSearch ??= Substitute.For<IWebSearch>();
        webExtractor ??= Substitute.For<IWebContentExtractor>();
        appSettings ??= Substitute.For<IAppSettings>();

        reranker.RerankAsync(Arg.Any<string>(), Arg.Any<IReadOnlyList<RetrievedChunk>>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<RerankedChunk>());

        retriever.RetrieveAsync(Arg.Any<RetrievalQuery>(), Arg.Any<CancellationToken>())
            .Returns(Array.Empty<RetrievedChunk>());

        var corpus = new CorpusQueryTool(retriever, reranker, NullLogger<CorpusQueryTool>.Instance);
        var webSearchTool = new WebSearchTool(webSearch, NullLogger<WebSearchTool>.Instance);
        var webFetchTool = new WebFetchTool(webExtractor, NullLogger<WebFetchTool>.Instance);
        var obsidianTool = new ObsidianReadTool(appSettings, NullLogger<ObsidianReadTool>.Instance);

        var options = Options.Create(new UnifiedSearchOptions
        {
            DefaultIncludeWeb = defaultIncludeWeb,
            MaxToolCalls = 10,
        });

        return new MafUnifiedSearch(
            agentRunner,
            corpus,
            webSearchTool,
            webFetchTool,
            obsidianTool,
            options,
            NullLogger<MafUnifiedSearch>.Instance);
    }

    [TestMethod]
    public async Task AnswerAsync_WhenAgentReturnsAnswer_ReturnsAgentAnswer()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        agentRunner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns(new AgentRunResult(
                FinalAnswer: "Agent answer",
                ToolCallTrace: [],
                Citations: [],
                AgentsEnabled: true));

        var sut = BuildSut(agentRunner);
        var query = new UnifiedSearchQuery("test question", null, IncludeWeb: false);

        var result = await sut.AnswerAsync(query, CancellationToken.None);

        result.Answer.Should().Be("Agent answer");
    }

    [TestMethod]
    public async Task AnswerAsync_WhenAgentFails_ReturnsFallbackAnswer()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        agentRunner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("LLM down"));

        var sut = BuildSut(agentRunner);
        var query = new UnifiedSearchQuery("test question", null, IncludeWeb: false);

        var result = await sut.AnswerAsync(query, CancellationToken.None);

        result.Answer.Should().NotBeNullOrWhiteSpace();
    }

    [TestMethod]
    public async Task AnswerAsync_WhenAgentReturnsEmptyAnswer_ReturnsFallbackFromCitations()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        agentRunner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns(new AgentRunResult(
                FinalAnswer: string.Empty,
                ToolCallTrace: [],
                Citations: [],
                AgentsEnabled: true));

        var sut = BuildSut(agentRunner);
        var query = new UnifiedSearchQuery("test question", null, IncludeWeb: false);

        var result = await sut.AnswerAsync(query, CancellationToken.None);

        result.Should().NotBeNull();
    }

    [TestMethod]
    public async Task AnswerAsync_WithCorpusChunks_IncludesCorpusCitations()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        agentRunner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns(new AgentRunResult("answer", [], [], true));

        var retriever = Substitute.For<IRetriever>();
        var chunk = new RetrievedChunk(
            ChunkId: "c1",
            NoteId: "note1",
            Text: "Relevant text",
            Embedding: [],
            CreatedAt: DateTimeOffset.UtcNow,
            ProfileId: null,
            Speaker: null,
            Score: 0.9);
        retriever.RetrieveAsync(Arg.Any<RetrievalQuery>(), Arg.Any<CancellationToken>())
            .Returns(new RetrievedChunk[] { chunk });

        var reranker = Substitute.For<IReranker>();
        reranker.RerankAsync(Arg.Any<string>(), Arg.Any<IReadOnlyList<RetrievedChunk>>(), Arg.Any<int>(), Arg.Any<CancellationToken>())
            .Returns(new RerankedChunk[] { new(chunk, 0.9) });

        var sut = BuildSut(agentRunner, retriever: retriever, reranker: reranker);
        var query = new UnifiedSearchQuery("test question", null, IncludeWeb: false);

        var result = await sut.AnswerAsync(query, CancellationToken.None);

        result.Citations.Should().ContainSingle(c => c.Source == SourceType.Corpus);
    }

    [TestMethod]
    public async Task AnswerAsync_WhenIncludeWebFalse_DoesNotCallWebSearch()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        agentRunner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns(new AgentRunResult("answer", [], [], true));

        var webSearch = Substitute.For<IWebSearch>();

        var sut = BuildSut(agentRunner, webSearch: webSearch, defaultIncludeWeb: false);
        var query = new UnifiedSearchQuery("test question", null, IncludeWeb: false);

        await sut.AnswerAsync(query, CancellationToken.None);

        await webSearch.DidNotReceive().SearchAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task AnswerAsync_NullQuery_ThrowsArgumentNullException()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        var sut = BuildSut(agentRunner);

        Func<Task> act = () => sut.AnswerAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task AnswerAsync_EmptyQuery_ThrowsArgumentException()
    {
        var agentRunner = Substitute.For<IAgentRunner>();
        var sut = BuildSut(agentRunner);

        Func<Task> act = () => sut.AnswerAsync(
            new UnifiedSearchQuery(string.Empty, null, false),
            CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }
}
