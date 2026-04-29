using System;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class InternalDictationPushTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task Push_UnknownSession_Returns404()
    {
        using var client = CreateClient();

        var payload = new
        {
            samples = new[] { 0.1f, 0.2f },
            sampleRate = 16_000,
            offsetSeconds = 0.0
        };
        using var response = await client.PostAsJsonAsync(
            $"/api/dictation/push/{Guid.NewGuid()}", payload, cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Push_EmptySamples_Returns400()
    {
        using var client = CreateClient();
        var manager = GetRequiredService<IDictationSessionManager>();
        var session = manager.Start(source: "test");

        try
        {
            var payload = new
            {
                samples = Array.Empty<float>(),
                sampleRate = 16_000,
                offsetSeconds = 0.0
            };
            using var response = await client.PostAsJsonAsync(
                $"/api/dictation/push/{session.Id}", payload, cancellationToken: TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        finally
        {
            await manager.CancelAsync(session.Id, TestContext.CancellationToken);
        }
    }
}
