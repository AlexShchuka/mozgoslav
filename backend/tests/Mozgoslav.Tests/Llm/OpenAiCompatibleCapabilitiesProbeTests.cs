using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Llm;

[TestClass]
public sealed class OpenAiCompatibleCapabilitiesProbeTests
{
    private const string ToolCallResponse = /*lang=json,strict*/ """
        {
          "choices": [
            {
              "finish_reason": "tool_calls",
              "message": {
                "role": "assistant",
                "tool_calls": [{ "type": "function", "function": { "name": "probe", "arguments": "{}" } }]
              }
            }
          ],
          "usage": { "prompt_tokens": 50, "total_tokens": 60 }
        }
        """;

    private const string NoToolCallResponse = /*lang=json,strict*/ """
        {
          "choices": [
            {
              "finish_reason": "stop",
              "message": { "role": "assistant", "content": "Hi there!" }
            }
          ],
          "usage": { "prompt_tokens": 20, "total_tokens": 25 }
        }
        """;

    private const string JsonModeOkResponse = /*lang=json,strict*/ """
        {
          "choices": [
            { "message": { "role": "assistant", "content": "{\"ok\":true}" } }
          ],
          "usage": { "prompt_tokens": 10, "total_tokens": 15 }
        }
        """;

    [TestMethod]
    public async Task ProbeAsync_ModelSupportsToolCalling_DetectsTrue()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, ToolCallResponse);
        await using var sp = BuildServiceProvider(handler);
        var probe = BuildProbe(sp);

        var caps = await probe.ProbeAsync(
            "http://localhost:1234", "qwen-7b", string.Empty, CancellationToken.None);

        caps.SupportsToolCalling.Should().BeTrue();
    }

    [TestMethod]
    public async Task ProbeAsync_ModelNoToolCalling_DetectsFalse()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, NoToolCallResponse);
        await using var sp = BuildServiceProvider(handler);
        var probe = BuildProbe(sp);

        var caps = await probe.ProbeAsync(
            "http://localhost:1234", "small-model", string.Empty, CancellationToken.None);

        caps.SupportsToolCalling.Should().BeFalse();
    }

    [TestMethod]
    public async Task ProbeAsync_JsonModeReturnsSuccess_DetectsTrue()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, JsonModeOkResponse);
        await using var sp = BuildServiceProvider(handler);
        var probe = BuildProbe(sp);

        var caps = await probe.ProbeAsync(
            "http://localhost:1234", "test-model", string.Empty, CancellationToken.None);

        caps.SupportsJsonMode.Should().BeTrue();
    }

    [TestMethod]
    public async Task ProbeAsync_EndpointDown_ReturnsFalseCapabilities()
    {
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.ServiceUnavailable, string.Empty);
        await using var sp = BuildServiceProvider(handler);
        var probe = BuildProbe(sp);

        var caps = await probe.ProbeAsync(
            "http://localhost:1234", "model", string.Empty, CancellationToken.None);

        caps.SupportsToolCalling.Should().BeFalse();
        caps.SupportsJsonMode.Should().BeFalse();
    }

    [TestMethod]
    public async Task ProbeAsync_PopulatesProbedAt_IsRecent()
    {
        var before = DateTimeOffset.UtcNow;
        using var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, NoToolCallResponse);
        await using var sp = BuildServiceProvider(handler);
        var probe = BuildProbe(sp);

        var caps = await probe.ProbeAsync(
            "http://localhost:1234", "m", string.Empty, CancellationToken.None);

        caps.ProbedAt.Should().BeOnOrAfter(before);
    }

    private static ServiceProvider BuildServiceProvider(HttpMessageHandler handler)
    {
        var services = new ServiceCollection();
        services.AddHttpClient("llm")
            .ConfigurePrimaryHttpMessageHandler(() => handler);
        return services.BuildServiceProvider();
    }

    private static OpenAiCompatibleCapabilitiesProbe BuildProbe(ServiceProvider sp)
    {
        var factory = sp.GetRequiredService<IHttpClientFactory>();
        return new OpenAiCompatibleCapabilitiesProbe(
            factory,
            NullLogger<OpenAiCompatibleCapabilitiesProbe>.Instance);
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
}
