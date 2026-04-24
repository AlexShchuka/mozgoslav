using System.Net.Http;

namespace Mozgoslav.Tests.Integration;

internal sealed class StubHttpClientFactory : IHttpClientFactory
{
    private readonly HttpClient _client;

    public StubHttpClientFactory(HttpClient client) => _client = client;

    public HttpClient CreateClient(string name) => _client;
}
