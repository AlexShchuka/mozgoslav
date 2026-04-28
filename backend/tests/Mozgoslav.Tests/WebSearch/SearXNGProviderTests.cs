using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.WebSearch;

namespace Mozgoslav.Tests.WebSearch;

[TestClass]
public sealed class SearXNGProviderTests
{
    [TestMethod]
    public async Task SearchAsync_WithValidResults_ReturnsMappedList()
    {
        var json = /*lang=json,strict*/ """
            {
              "results": [
                { "title": "Title 1", "url": "https://example.com/1", "content": "Snippet one" },
                { "title": "Title 2", "url": "https://example.com/2", "content": "Snippet two" }
              ]
            }
            """;

        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, json);
        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8888") };
        var provider = new SearXNGProvider(httpClient, NullLogger<SearXNGProvider>.Instance);

        var results = await provider.SearchAsync("test query", 10, CancellationToken.None);

        results.Should().HaveCount(2);
        results[0].Title.Should().Be("Title 1");
        results[0].Url.Should().Be("https://example.com/1");
        results[0].Snippet.Should().Be("Snippet one");
    }

    [TestMethod]
    public async Task SearchAsync_TopLimitsResultCount()
    {
        var json = /*lang=json,strict*/ """
            {
              "results": [
                { "title": "T1", "url": "https://a.com/1", "content": "S1" },
                { "title": "T2", "url": "https://a.com/2", "content": "S2" },
                { "title": "T3", "url": "https://a.com/3", "content": "S3" }
              ]
            }
            """;

        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, json);
        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8888") };
        var provider = new SearXNGProvider(httpClient, NullLogger<SearXNGProvider>.Instance);

        var results = await provider.SearchAsync("query", 2, CancellationToken.None);

        results.Should().HaveCount(2);
    }

    [TestMethod]
    public async Task SearchAsync_EmptyQuery_ReturnsEmptyWithoutCallingServer()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, /*lang=json,strict*/ """{"results":[]}""");
        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8888") };
        var provider = new SearXNGProvider(httpClient, NullLogger<SearXNGProvider>.Instance);

        var results = await provider.SearchAsync("   ", 10, CancellationToken.None);

        results.Should().BeEmpty();
    }

    [TestMethod]
    public async Task SearchAsync_SidecarDown_ReturnsEmptyInsteadOfThrowing()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.ServiceUnavailable, string.Empty);
        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8888") };
        var provider = new SearXNGProvider(httpClient, NullLogger<SearXNGProvider>.Instance);

        var results = await provider.SearchAsync("test", 10, CancellationToken.None);

        results.Should().BeEmpty();
    }

    [TestMethod]
    public async Task SearchAsync_EmptyResultsArray_ReturnsEmptyList()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, /*lang=json,strict*/ """{"results":[]}""");
        using var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:8888") };
        var provider = new SearXNGProvider(httpClient, NullLogger<SearXNGProvider>.Instance);

        var results = await provider.SearchAsync("query", 10, CancellationToken.None);

        results.Should().BeEmpty();
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
            var response = new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_content, Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(response);
        }
    }
}
