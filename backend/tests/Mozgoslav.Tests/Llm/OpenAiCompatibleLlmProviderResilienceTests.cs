using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Llm;

[TestClass]
public sealed class OpenAiCompatibleLlmProviderResilienceTests
{
    private const string ValidResponse = /*lang=json,strict*/ """
        {
          "choices": [
            {
              "message": { "role": "assistant", "content": "{\"summary\":\"ok\"}" }
            }
          ]
        }
        """;

    [TestMethod]
    public async Task ChatAsync_SuccessResponse_ReturnsContent()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns("http://localhost:1234");
        settings.LlmModel.Returns("test-model");
        settings.LlmApiKey.Returns(string.Empty);

        var services = new ServiceCollection();
        services.AddHttpClient("llm")
            .ConfigurePrimaryHttpMessageHandler(
                () => new FakeHttpMessageHandler(HttpStatusCode.OK, ValidResponse));
        await using var sp = services.BuildServiceProvider();

        var provider = new OpenAiCompatibleLlmProvider(
            sp.GetRequiredService<IHttpClientFactory>(),
            settings,
            NullLogger<OpenAiCompatibleLlmProvider>.Instance);

        var result = await provider.ChatAsync("system", "user", CancellationToken.None);

        const string expectedJson = "{\"summary\":\"ok\"}";
        result.Should().Be(expectedJson);
    }

    [TestMethod]
    public async Task ChatAsync_ErrorResponse_ReturnsEmpty()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns("http://localhost:1234");
        settings.LlmModel.Returns("test-model");
        settings.LlmApiKey.Returns(string.Empty);

        var services = new ServiceCollection();
        services.AddHttpClient("llm")
            .ConfigurePrimaryHttpMessageHandler(
                () => new FakeHttpMessageHandler(HttpStatusCode.ServiceUnavailable, string.Empty));
        await using var sp = services.BuildServiceProvider();

        var provider = new OpenAiCompatibleLlmProvider(
            sp.GetRequiredService<IHttpClientFactory>(),
            settings,
            NullLogger<OpenAiCompatibleLlmProvider>.Instance);

        var result = await provider.ChatAsync("system", "user", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task ChatAsync_MissingEndpoint_ReturnsEmpty()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns(string.Empty);
        settings.LlmModel.Returns(string.Empty);
        settings.LlmApiKey.Returns(string.Empty);

        var services = new ServiceCollection();
        services.AddHttpClient("llm");
        await using var sp = services.BuildServiceProvider();

        var provider = new OpenAiCompatibleLlmProvider(
            sp.GetRequiredService<IHttpClientFactory>(),
            settings,
            NullLogger<OpenAiCompatibleLlmProvider>.Instance);

        var result = await provider.ChatAsync("system", "user", CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task Provider_UsesNamedLlmClient_RequestReachesRegisteredHandler()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns("http://localhost:1234");
        settings.LlmModel.Returns("m");
        settings.LlmApiKey.Returns(string.Empty);

        var handlerWasCalled = false;
        var services = new ServiceCollection();
        services.AddHttpClient("llm")
            .ConfigurePrimaryHttpMessageHandler(() =>
                new CapturingHandler(HttpStatusCode.OK, ValidResponse, () => handlerWasCalled = true));
        await using var sp = services.BuildServiceProvider();

        var provider = new OpenAiCompatibleLlmProvider(
            sp.GetRequiredService<IHttpClientFactory>(),
            settings,
            NullLogger<OpenAiCompatibleLlmProvider>.Instance);

        await provider.ChatAsync("s", "u", CancellationToken.None);

        handlerWasCalled.Should().BeTrue();
    }

    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _content;

        public FakeHttpMessageHandler(HttpStatusCode statusCode, string content)
        {
            _statusCode = statusCode;
            _content = content;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_content, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class CapturingHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _content;
        private readonly Action _onCall;

        public CapturingHandler(HttpStatusCode statusCode, string content, Action onCall)
        {
            _statusCode = statusCode;
            _content = content;
            _onCall = onCall;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            _onCall();
            return Task.FromResult(new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_content, Encoding.UTF8, "application/json")
            });
        }
    }
}
