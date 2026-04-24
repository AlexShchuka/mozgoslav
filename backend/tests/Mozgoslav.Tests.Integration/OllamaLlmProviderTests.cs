using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class OllamaLlmProviderTests : IDisposable
{
    private HttpClient _httpClient = null!;
    private IHttpClientFactory _stubFactory = null!;
    private WireMockServer _server = null!;
    private IAppSettings _settings = null!;
    private OllamaLlmProvider _provider = null!;

    [TestInitialize]
    public void Init()
    {
        _httpClient = new HttpClient();
        _stubFactory = new StubHttpClientFactory(_httpClient);
        _server = WireMockServer.Start();
        _settings = Substitute.For<IAppSettings>();
        _settings.LlmEndpoint.Returns(_server.Urls[0]);
        _settings.LlmApiKey.Returns(string.Empty);
        _settings.LlmModel.Returns("qwen2.5:14b");

        _provider = new OllamaLlmProvider(_settings, _stubFactory, NullLogger<OllamaLlmProvider>.Instance);
    }

    [TestCleanup]
    public void Cleanup()
    {
        _server.Stop();
        _server.Dispose();
        _httpClient.Dispose();
    }

    public void Dispose()
    {
        _server?.Dispose();
        _httpClient?.Dispose();
    }

    [TestMethod]
    public void Kind_IsOllama()
    {
        _provider.Kind.Should().Be("ollama");
    }

    [TestMethod]
    public async Task Chat_HappyPath_ReturnsText()
    {
        _server.Given(Request.Create().WithPath("/api/chat").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode((int)HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBody(
                                         /*lang=json,strict*/
                                         """
                    {
                      "model": "qwen2.5:14b",
                      "created_at": "2026-04-17T12:00:00Z",
                      "message": {"role":"assistant","content":"hello from ollama"},
                      "done": true
                    }
                    """));

        var result = await _provider.ChatAsync("system", "hi?", CancellationToken.None);

        result.Should().Be("hello from ollama");
    }

    [TestMethod]
    public async Task Chat_HttpError_ReturnsEmpty()
    {
        _server.Given(Request.Create().WithPath("/api/chat").UsingPost())
            .RespondWith(Response.Create().WithStatusCode((int)HttpStatusCode.InternalServerError));

        var result = await _provider.ChatAsync("sys", "user", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Chat_NoServer_ReturnsEmpty()
    {
        _server.Stop();

        var result = await _provider.ChatAsync("sys", "user", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Chat_SendsStreamFalse()
    {
        _server.Given(Request.Create().WithPath("/api/chat").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode((int)HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBody(
                                         /*lang=json,strict*/
                                         """{"message":{"role":"assistant","content":"ok"},"done":true}"""));

        await _provider.ChatAsync("sys", "user", CancellationToken.None);

        var body = _server.LogEntries.Single().RequestMessage!.Body;
        body.Should().Contain("\"stream\":false");
        body.Should().Contain("qwen2.5:14b");
    }
}
