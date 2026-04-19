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

/// <summary>
/// Contract-level coverage for <c>AnthropicLlmProvider</c> against a WireMock-hosted
/// Messages API. Tests the happy path (response content extraction) and graceful
/// degradation on HTTP errors / timeouts per ADR-007.
/// </summary>
[TestClass]
public sealed class AnthropicLlmProviderTests
{
    private WireMockServer _server = null!;
    private IAppSettings _settings = null!;
    private IHttpClientFactory _httpFactory = null!;
    private AnthropicLlmProvider _provider = null!;

    [TestInitialize]
    public void Init()
    {
        _server = WireMockServer.Start();
        _settings = Substitute.For<IAppSettings>();
        _settings.LlmEndpoint.Returns(_server.Urls[0]);
        _settings.LlmApiKey.Returns("sk-ant-test");
        _settings.LlmModel.Returns("claude-3-5-sonnet-20241022");

        _httpFactory = Substitute.For<IHttpClientFactory>();
#pragma warning disable CA2000, IDISP004
        _httpFactory.CreateClient(Arg.Any<string>()).Returns(_ => new HttpClient());
#pragma warning restore CA2000, IDISP004

        _provider = new AnthropicLlmProvider(_settings, _httpFactory, NullLogger<AnthropicLlmProvider>.Instance);
    }

    [TestCleanup]
    public void Cleanup()
    {
        _server.Stop();
        _server.Dispose();
    }

    [TestMethod]
    public void Kind_IsAnthropic()
    {
        _provider.Kind.Should().Be("anthropic");
    }

    [TestMethod]
    public async Task Chat_HappyPath_ReturnsText()
    {
        _server.Given(Request.Create().WithPath("/v1/messages").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode((int)HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBody(/*lang=json,strict*/
                    """
                    {
                      "id": "msg_01",
                      "type": "message",
                      "role": "assistant",
                      "content": [{"type":"text","text":"hello from claude"}],
                      "model": "claude-3-5-sonnet-20241022",
                      "stop_reason": "end_turn"
                    }
                    """));

        var result = await _provider.ChatAsync("system", "hello?", CancellationToken.None);

        result.Should().Be("hello from claude");
    }

    [TestMethod]
    public async Task Chat_HttpError_ReturnsEmpty()
    {
        _server.Given(Request.Create().WithPath("/v1/messages").UsingPost())
            .RespondWith(Response.Create().WithStatusCode((int)HttpStatusCode.InternalServerError));

        var result = await _provider.ChatAsync("system", "hello?", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Chat_NoServer_ReturnsEmpty()
    {
        _server.Stop();

        var result = await _provider.ChatAsync("system", "hello?", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Chat_SendsApiKeyAndVersionHeaders()
    {
        _server.Given(Request.Create().WithPath("/v1/messages").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode((int)HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBody(/*lang=json,strict*/
                    """{"content":[{"type":"text","text":"ok"}]}"""));

        await _provider.ChatAsync("sys", "user", CancellationToken.None);

        var recorded = _server.LogEntries.Single();
        recorded.RequestMessage.Headers.Should().ContainKey("x-api-key");
        recorded.RequestMessage.Headers!["x-api-key"].Should().Contain("sk-ant-test");
        recorded.RequestMessage.Headers.Should().ContainKey("anthropic-version");
    }
}
