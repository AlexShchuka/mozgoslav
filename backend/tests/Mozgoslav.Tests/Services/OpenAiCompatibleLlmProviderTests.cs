using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Services;

[TestClass]
public sealed class OpenAiCompatibleLlmProviderTests
{
    private const string Endpoint = "http://localhost:1234";

    private const string ChatSuccessBody = """
        {
          "choices": [
            { "message": { "role": "assistant", "content": "ok" } }
          ]
        }
        """;

    [TestMethod]
    public async Task ChatAsync_WhenCapabilitiesNull_DoesNotSendResponseFormat()
    {
        using var handler = new RecordingHandler();
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: "qwen2");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = BuildProvider(handler, settings, capabilities);

        var result = await provider.ChatAsync("system", "user", CancellationToken.None);

        result.Should().Be("ok");
        handler.LastChatBody.Should().NotBeNull();
        handler.LastChatBody.Should().NotContain("response_format");
    }

    [TestMethod]
    public async Task ChatAsync_WhenSupportsJsonModeFalse_DoesNotSendResponseFormat()
    {
        using var handler = new RecordingHandler();
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: "qwen2");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns(BuildCapabilities(supportsJsonMode: false));

        var provider = BuildProvider(handler, settings, capabilities);

        await provider.ChatAsync("system", "user", CancellationToken.None);

        handler.LastChatBody.Should().NotBeNull();
        handler.LastChatBody.Should().NotContain("response_format");
    }

    [TestMethod]
    public async Task ChatAsync_WhenSupportsJsonModeTrue_SendsResponseFormatJsonObject()
    {
        using var handler = new RecordingHandler();
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: "qwen2");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns(BuildCapabilities(supportsJsonMode: true));

        var provider = BuildProvider(handler, settings, capabilities);

        await provider.ChatAsync("system", "user", CancellationToken.None);

        handler.LastChatBody.Should().NotBeNull();
        handler.LastChatBody.Should().Contain("\"response_format\"");
        handler.LastChatBody.Should().Contain("\"json_object\"");
    }

    [TestMethod]
    public async Task ChatAsync_OnNonSuccess_LogsBodyExcerpt()
    {
        using var handler = new RecordingHandler();
        const string ErrorBody = "model 'whatever' is not loaded; pick from /v1/models";
        handler.SetChatResponse(HttpStatusCode.BadRequest, ErrorBody);

        var settings = BuildSettings(model: "qwen2");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var captured = new CapturingLogger();
        var provider = BuildProvider(handler, settings, capabilities, captured);

        var result = await provider.ChatAsync("system", "user", CancellationToken.None);

        result.Should().BeEmpty();
        captured.Lines.Should().Contain(line =>
            line.Contains("BadRequest", StringComparison.Ordinal)
            && line.Contains("model 'whatever' is not loaded", StringComparison.Ordinal));
    }

    [TestMethod]
    public async Task ChatAsync_WhenModelEmpty_ResolvesFromV1Models_AndCachesResult()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK,
            """{ "data": [ { "id": "auto-resolved-model" } ] }""");
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: string.Empty);
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = BuildProvider(handler, settings, capabilities);

        await provider.ChatAsync("s", "u1", CancellationToken.None);
        await provider.ChatAsync("s", "u2", CancellationToken.None);

        handler.ModelsCallCount.Should().Be(1);
        handler.ChatBodies.Should().HaveCount(2);
        handler.ChatBodies[0].Should().Contain("\"auto-resolved-model\"");
        handler.ChatBodies[1].Should().Contain("\"auto-resolved-model\"");
    }

    [TestMethod]
    public async Task ChatAsync_WhenModelExplicit_DoesNotCallV1Models()
    {
        using var handler = new RecordingHandler();
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: "explicit-model");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = BuildProvider(handler, settings, capabilities);

        await provider.ChatAsync("s", "u", CancellationToken.None);

        handler.ModelsCallCount.Should().Be(0);
        handler.LastChatBody.Should().Contain("\"explicit-model\"");
    }

    [TestMethod]
    public async Task ChatAsync_WhenModelLiteralDefault_ResolvesFromV1Models()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK,
            """{ "data": [ { "id": "real-model" } ] }""");
        handler.SetChatResponse(HttpStatusCode.OK, ChatSuccessBody);

        var settings = BuildSettings(model: "default");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var provider = BuildProvider(handler, settings, capabilities);

        await provider.ChatAsync("s", "u", CancellationToken.None);

        handler.ModelsCallCount.Should().Be(1);
        handler.LastChatBody.Should().Contain("\"real-model\"");
        handler.LastChatBody.Should().NotContain("\"default\"");
    }

    private static IAppSettings BuildSettings(string model)
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns(Endpoint);
        settings.LlmModel.Returns(model);
        settings.LlmApiKey.Returns(string.Empty);
        return settings;
    }

    private static LlmCapabilities BuildCapabilities(bool supportsJsonMode) =>
        new(SupportsToolCalling: false,
            SupportsJsonMode: supportsJsonMode,
            CtxLength: 4096,
            TokensPerSecond: 50,
            ProbedAt: DateTimeOffset.UtcNow);

    private static OpenAiCompatibleLlmProvider BuildProvider(
        RecordingHandler handler,
        IAppSettings settings,
        ILlmCapabilitiesCache capabilitiesCache,
        ILogger<OpenAiCompatibleLlmProvider>? logger = null)
    {
        var factory = new HandlerHttpClientFactory(handler);
        return new OpenAiCompatibleLlmProvider(
            factory,
            settings,
            capabilitiesCache,
            logger ?? NullLogger<OpenAiCompatibleLlmProvider>.Instance);
    }

    private sealed class HandlerHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public HandlerHttpClientFactory(HttpMessageHandler handler) => _handler = handler;

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private HttpStatusCode _chatStatus = HttpStatusCode.OK;
        private string _chatBody = string.Empty;
        private HttpStatusCode _modelsStatus = HttpStatusCode.OK;
        private string _modelsBody = string.Empty;

        public List<string> ChatBodies { get; } = [];
        public int ModelsCallCount { get; private set; }
        public string? LastChatBody => ChatBodies.Count == 0 ? null : ChatBodies[^1];

        public void SetChatResponse(HttpStatusCode status, string body)
        {
            _chatStatus = status;
            _chatBody = body;
        }

        public void SetModelsResponse(HttpStatusCode status, string body)
        {
            _modelsStatus = status;
            _modelsBody = body;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var pathAndQuery = request.RequestUri!.AbsolutePath;
            if (pathAndQuery.EndsWith("/v1/chat/completions", StringComparison.Ordinal))
            {
                if (request.Content is null)
                {
                    ChatBodies.Add(string.Empty);
                }
                else
                {
                    var body = await request.Content.ReadAsStringAsync(cancellationToken);
                    ChatBodies.Add(body);
                }
                return new HttpResponseMessage(_chatStatus)
                {
                    Content = new StringContent(_chatBody, Encoding.UTF8, "application/json")
                };
            }

            if (pathAndQuery.EndsWith("/v1/models", StringComparison.Ordinal))
            {
                ModelsCallCount++;
                return new HttpResponseMessage(_modelsStatus)
                {
                    Content = new StringContent(_modelsBody, Encoding.UTF8, "application/json")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        }
    }

    private sealed class CapturingLogger : ILogger<OpenAiCompatibleLlmProvider>
    {
        public List<string> Lines { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            Lines.Add(formatter(state, exception));
        }
    }
}
