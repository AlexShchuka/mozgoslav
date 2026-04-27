using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Infrastructure.WebSearch;

namespace Mozgoslav.Tests.WebSearch;

[TestClass]
public sealed class TrafilaturaProviderTests
{
    [TestMethod]
    public async Task ExtractAsync_ValidResponse_ReturnsMappedWebContent()
    {
        var json = """
            {
              "title": "Article Title",
              "body": "Main article body text.",
              "lang": "ru",
              "excerpt": "Short excerpt"
            }
            """;

        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, json);
        var client = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:5060") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        try
        {
            var provider = new TrafilaturaProvider(
                client, cache, TimeSpan.FromHours(24),
                NullLogger<TrafilaturaProvider>.Instance);

            var result = await provider.ExtractAsync(
                "https://example.com/article", CancellationToken.None);

            result.Title.Should().Be("Article Title");
            result.Body.Should().Be("Main article body text.");
            result.Lang.Should().Be("ru");
            result.Excerpt.Should().Be("Short excerpt");
        }
        finally
        {
            client.Dispose();
            handler.Dispose();
            cache.Dispose();
        }
    }

    [TestMethod]
    public async Task ExtractAsync_SidecarDown_ReturnsEmptyWebContent()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.ServiceUnavailable, string.Empty);
        var client = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:5060") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        try
        {
            var provider = new TrafilaturaProvider(
                client, cache, TimeSpan.FromHours(24),
                NullLogger<TrafilaturaProvider>.Instance);

            var result = await provider.ExtractAsync(
                "https://example.com/fail", CancellationToken.None);

            result.Title.Should().BeEmpty();
            result.Body.Should().BeEmpty();
            result.Lang.Should().BeNull();
        }
        finally
        {
            client.Dispose();
            handler.Dispose();
            cache.Dispose();
        }
    }

    [TestMethod]
    public async Task ExtractAsync_SamUrlSecondCall_ReturnsCachedResult()
    {
        var callCount = 0;
        var json = """{"title":"Cached","body":"Body","lang":"en","excerpt":null}""";

        var handler = new CountingFakeHandler(HttpStatusCode.OK, json, () => callCount++);
        var client = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:5060") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        try
        {
            var provider = new TrafilaturaProvider(
                client, cache, TimeSpan.FromHours(24),
                NullLogger<TrafilaturaProvider>.Instance);

            await provider.ExtractAsync("https://example.com/page", CancellationToken.None);
            await provider.ExtractAsync("https://example.com/page", CancellationToken.None);

            callCount.Should().Be(1);
        }
        finally
        {
            client.Dispose();
            handler.Dispose();
            cache.Dispose();
        }
    }

    [TestMethod]
    public async Task ExtractAsync_NullOrEmptyUrl_ThrowsArgumentException()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "{}");
        var client = new HttpClient(handler) { BaseAddress = new Uri("http://127.0.0.1:5060") };
        var cache = new MemoryCache(Options.Create(new MemoryCacheOptions()));
        try
        {
            var provider = new TrafilaturaProvider(
                client, cache, TimeSpan.FromHours(24),
                NullLogger<TrafilaturaProvider>.Instance);

            var act = () => provider.ExtractAsync(string.Empty, CancellationToken.None);

            await act.Should().ThrowAsync<ArgumentException>();
        }
        finally
        {
            client.Dispose();
            handler.Dispose();
            cache.Dispose();
        }
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

    private sealed class CountingFakeHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _content;
        private readonly Action _onCall;

        public CountingFakeHandler(HttpStatusCode statusCode, string content, Action onCall)
        {
            _statusCode = statusCode;
            _content = content;
            _onCall = onCall;
        }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            _onCall();
            var response = new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_content, Encoding.UTF8, "application/json"),
            };
            return Task.FromResult(response);
        }
    }
}
