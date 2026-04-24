using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class OpenAiCompatibleLlmServiceTests
{
    private WireMockServer _server = null!;
    private IAppSettings _settings = null!;
    private IHttpClientFactory _httpFactory = null!;
    private OpenAiCompatibleLlmService _service = null!;

    [TestInitialize]
    public void Init()
    {
        _server = WireMockServer.Start();
        _settings = Substitute.For<IAppSettings>();
        _settings.LlmProvider.Returns("openai_compatible");
        _settings.LlmEndpoint.Returns(_server.Urls[0]);
        _settings.LlmApiKey.Returns("test-key");
        _settings.LlmModel.Returns("test-model");

        _httpFactory = Substitute.For<IHttpClientFactory>();
#pragma warning disable CA2000, IDISP004
        _httpFactory.CreateClient(Arg.Any<string>()).Returns(_ => new HttpClient());
#pragma warning restore CA2000, IDISP004

        var openAiProvider = new OpenAiCompatibleLlmProvider(
            _settings, NullLogger<OpenAiCompatibleLlmProvider>.Instance);
        var providerFactory = Substitute.For<ILlmProviderFactory>();
        providerFactory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult<ILlmProvider>(openAiProvider));

        _service = new OpenAiCompatibleLlmService(
            providerFactory, _settings, _httpFactory, NullLogger<OpenAiCompatibleLlmService>.Instance);
    }

    [TestCleanup]
    public void Cleanup()
    {
        _server.Stop();
        _server.Dispose();
    }

    [TestMethod]
    public async Task IsAvailableAsync_ServerReturns200_ReturnsTrue()
    {
        _server.Given(Request.Create().WithPath("/v1/models").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBody(/*lang=json,strict*/ "{\"data\":[]}"));

        var result = await _service.IsAvailableAsync(CancellationToken.None);

        result.Should().BeTrue();
    }

    [TestMethod]
    public async Task IsAvailableAsync_ServerReturns500_ReturnsFalse()
    {
        _server.Given(Request.Create().WithPath("/v1/models").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(500));

        var result = await _service.IsAvailableAsync(CancellationToken.None);

        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task IsAvailableAsync_NoServer_ReturnsFalse()
    {
        _server.Stop();

        var result = await _service.IsAvailableAsync(CancellationToken.None);

        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task ProcessAsync_EmptyTranscript_ReturnsEmptyResult()
    {
        var result = await _service.ProcessAsync("   ", "system prompt", CancellationToken.None);

        result.Summary.Should().BeEmpty();
        result.KeyPoints.Should().BeEmpty();
    }

    [TestMethod]
    public async Task ProcessAsync_ValidJsonResponse_ReturnsTypedResult()
    {
        const string Content = /*lang=json,strict*/ """
            {
              "summary": "A short summary",
              "key_points": ["point one", "point two"],
              "decisions": ["decided"],
              "action_items": [{"person": "Alice", "task": "do X", "deadline": "tomorrow"}],
              "unresolved_questions": ["why?"],
              "participants": ["Alice", "Bob"],
              "topic": "Testing",
              "conversation_type": "meeting",
              "tags": ["demo"]
            }
            """;
        StubChatCompletion(Content);

        var result = await _service.ProcessAsync("transcript body", "system prompt", CancellationToken.None);

        result.Summary.Should().Be("A short summary");
        result.KeyPoints.Should().BeEquivalentTo("point one", "point two");
        result.Decisions.Should().BeEquivalentTo("decided");
        result.ActionItems.Should().ContainSingle()
            .Which.Person.Should().Be("Alice");
        result.Participants.Should().BeEquivalentTo("Alice", "Bob");
        result.Topic.Should().Be("Testing");
        result.ConversationType.Should().Be(ConversationType.Meeting);
        result.Tags.Should().BeEquivalentTo("demo");
    }

    [TestMethod]
    public async Task ProcessAsync_JsonWithMarkdownFence_StripsAndParses()
    {
        const string Content = """
            Here's your answer:
            ```json
            {"summary": "fenced summary", "key_points": [], "decisions": [], "action_items": [], "unresolved_questions": [], "participants": [], "topic": "t", "conversation_type": "idea", "tags": []}
            ```
            """;
        StubChatCompletion(Content);

        var result = await _service.ProcessAsync("t", "s", CancellationToken.None);

        result.Summary.Should().Be("fenced summary");
        result.ConversationType.Should().Be(ConversationType.Idea);
    }

    [TestMethod]
    public async Task ProcessAsync_NonJsonContent_FallsBackToRawSummary()
    {
        const string Content = "Sorry, I cannot produce JSON output.";
        StubChatCompletion(Content);

        var result = await _service.ProcessAsync("t", "s", CancellationToken.None);

        result.Summary.Should().Be("Sorry, I cannot produce JSON output.");
        result.KeyPoints.Should().BeEmpty();
    }

    [TestMethod]
    public async Task ProcessAsync_ServerError_ReturnsEmptyResultGracefully()
    {
        _server.Given(Request.Create().WithPath("/v1/chat/completions").UsingPost())
            .RespondWith(Response.Create().WithStatusCode(500));

        var result = await _service.ProcessAsync("t", "s", CancellationToken.None);

        result.Summary.Should().BeEmpty();
    }

    [TestMethod]
    public async Task ProcessAsync_UnknownConversationType_FallsBackToOther()
    {
        const string Content = /*lang=json,strict*/ """
            {"summary": "x", "key_points": [], "decisions": [], "action_items": [], "unresolved_questions": [], "participants": [], "topic": "t", "conversation_type": "unknown-variant", "tags": []}
            """;
        StubChatCompletion(Content);

        var result = await _service.ProcessAsync("t", "s", CancellationToken.None);

        result.ConversationType.Should().Be(ConversationType.Other);
    }

    private void StubChatCompletion(string content)
    {
        var body = $$"""
            {
              "id": "chatcmpl-1",
              "object": "chat.completion",
              "created": 1712345678,
              "model": "test-model",
              "choices": [
                {
                  "index": 0,
                  "message": { "role": "assistant", "content": {{JsonSerializer.Serialize(content)}} },
                  "finish_reason": "stop"
                }
              ],
              "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            }
            """;

        _server.Given(Request.Create().WithPath("/v1/chat/completions").UsingPost())
            .RespondWith(Response.Create().WithStatusCode((int)HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBody(body));
    }
}
