using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Services;

[TestClass]
public sealed class OpenAiCompatibleModelCatalogServiceTests
{
    private const string Endpoint = "http://localhost:1234";

    [TestMethod]
    public async Task GetAvailableAsync_WhenEndpointEmpty_ReturnsEmpty_WithoutHttpCalls()
    {
        using var handler = new RecordingHandler();
        var settings = BuildSettings(endpoint: string.Empty, model: string.Empty);
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().BeEmpty();
        handler.ModelsCallCount.Should().Be(0);
    }

    [TestMethod]
    public async Task GetAvailableAsync_OnHappyPath_MapsIdAndOwnedBy()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK, """
            { "data": [
                { "id": "m1", "owned_by": "o" },
                { "id": "m2" }
            ] }
            """);
        var settings = BuildSettings(endpoint: Endpoint, model: "m1");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].Id.Should().Be("m1");
        result[0].OwnedBy.Should().Be("o");
        result[1].Id.Should().Be("m2");
        result[1].OwnedBy.Should().BeNull();
    }

    [TestMethod]
    public async Task GetAvailableAsync_InjectsCapabilities_OnlyForResolvedModel()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK, """
            { "data": [
                { "id": "m1" },
                { "id": "m2" }
            ] }
            """);
        var settings = BuildSettings(endpoint: Endpoint, model: "m2");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns(new LlmCapabilities(
            SupportsToolCalling: true,
            SupportsJsonMode: true,
            CtxLength: 8192,
            TokensPerSecond: 42,
            ProbedAt: DateTimeOffset.UtcNow));

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().HaveCount(2);
        var m1 = result[0];
        m1.Id.Should().Be("m1");
        m1.SupportsJsonMode.Should().BeNull();
        m1.SupportsToolCalling.Should().BeNull();
        m1.ContextLength.Should().BeNull();

        var m2 = result[1];
        m2.Id.Should().Be("m2");
        m2.SupportsJsonMode.Should().BeTrue();
        m2.SupportsToolCalling.Should().BeTrue();
        m2.ContextLength.Should().Be(8192);
    }

    [TestMethod]
    public async Task GetAvailableAsync_WhenModelBlank_ResolvesFirstAsCurrent()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK, """
            { "data": [
                { "id": "first" },
                { "id": "second" }
            ] }
            """);
        var settings = BuildSettings(endpoint: Endpoint, model: string.Empty);
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns(new LlmCapabilities(
            SupportsToolCalling: false,
            SupportsJsonMode: true,
            CtxLength: 4096,
            TokensPerSecond: 25,
            ProbedAt: DateTimeOffset.UtcNow));

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().HaveCount(2);
        result[0].Id.Should().Be("first");
        result[0].SupportsJsonMode.Should().BeTrue();
        result[1].Id.Should().Be("second");
        result[1].SupportsJsonMode.Should().BeNull();
    }

    [TestMethod]
    public async Task GetAvailableAsync_WhenServerErrors_ReturnsEmpty_NoException()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.InternalServerError, "boom");
        var settings = BuildSettings(endpoint: Endpoint, model: "m1");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public async Task GetAvailableAsync_SkipsEntriesWithBlankId()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK, """
            { "data": [
                { "id": "" },
                { "id": "real" }
            ] }
            """);
        var settings = BuildSettings(endpoint: Endpoint, model: "real");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns((LlmCapabilities?)null);

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result.Should().HaveCount(1);
        result[0].Id.Should().Be("real");
    }

    [TestMethod]
    public async Task GetAvailableAsync_WhenModelLiteralDefault_TreatsFirstAsCurrent()
    {
        using var handler = new RecordingHandler();
        handler.SetModelsResponse(HttpStatusCode.OK, """
            { "data": [
                { "id": "first" },
                { "id": "second" }
            ] }
            """);
        var settings = BuildSettings(endpoint: Endpoint, model: "default");
        var capabilities = Substitute.For<ILlmCapabilitiesCache>();
        capabilities.TryGetCurrent().Returns(new LlmCapabilities(
            SupportsToolCalling: true,
            SupportsJsonMode: false,
            CtxLength: 2048,
            TokensPerSecond: 10,
            ProbedAt: DateTimeOffset.UtcNow));

        var service = BuildService(handler, settings, capabilities);

        var result = await service.GetAvailableAsync(CancellationToken.None);

        result[0].Id.Should().Be("first");
        result[0].SupportsToolCalling.Should().BeTrue();
        result[1].SupportsToolCalling.Should().BeNull();
    }

    private static IAppSettings BuildSettings(string endpoint, string model)
    {
        var settings = Substitute.For<IAppSettings>();
        settings.LlmEndpoint.Returns(endpoint);
        settings.LlmModel.Returns(model);
        settings.LlmApiKey.Returns(string.Empty);
        return settings;
    }

    private static OpenAiCompatibleModelCatalogService BuildService(
        RecordingHandler handler,
        IAppSettings settings,
        ILlmCapabilitiesCache capabilitiesCache)
    {
        var factory = new HandlerHttpClientFactory(handler);
        return new OpenAiCompatibleModelCatalogService(
            factory,
            settings,
            capabilitiesCache,
            NullLogger<OpenAiCompatibleModelCatalogService>.Instance);
    }

    private sealed class HandlerHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpMessageHandler _handler;

        public HandlerHttpClientFactory(HttpMessageHandler handler) => _handler = handler;

        public HttpClient CreateClient(string name) => new(_handler, disposeHandler: false);
    }

    private sealed class RecordingHandler : HttpMessageHandler
    {
        private HttpStatusCode _modelsStatus = HttpStatusCode.OK;
        private string _modelsBody = string.Empty;

        public int ModelsCallCount { get; private set; }

        public void SetModelsResponse(HttpStatusCode status, string body)
        {
            _modelsStatus = status;
            _modelsBody = body;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var pathAndQuery = request.RequestUri!.AbsolutePath;
            if (pathAndQuery.EndsWith("/v1/models", StringComparison.Ordinal))
            {
                ModelsCallCount++;
                return Task.FromResult(new HttpResponseMessage(_modelsStatus)
                {
                    Content = new StringContent(_modelsBody, Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }
}
