using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Persistence;

using NSubstitute;

namespace Mozgoslav.Tests.Graph.Recordings;

[TestClass]
public sealed class RecordingMutationTests : GraphTestsBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task DeleteRecording_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  deleteRecording(id: ""00000000-0000-0000-0000-000000000001"") {
    recording {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["deleteRecording"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["deleteRecording"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task StartRecording_WhenRecorderNotSupported_ReturnsUnavailable()
    {
        var result = await ExecuteAsync(@"
mutation {
  startRecording {
    sessionId
    recordingId
    dictationSessionId
    outputPath
    errors {
      code
      message
    }
  }
}");

        var payload = result["data"]!["startRecording"]!;
        payload["errors"]!.AsArray().Should().HaveCount(1);
        payload["errors"]![0]!["code"]!.GetValue<string>().Should().Be("UNAVAILABLE");
        payload["sessionId"].Should().BeNull();
        payload["dictationSessionId"].Should().BeNull();
    }

    [TestMethod]
    public async Task StartRecording_WhenSupported_CallsDictationManagerStartWithLongformAndReturnsDictationSessionId()
    {
        var dictationSessionId = Guid.NewGuid();

        var recorder = Substitute.For<IAudioRecorder>();
        recorder.IsSupported.Returns(true);
        recorder.IsRecording.Returns(false);
        recorder.CurrentDuration.Returns(TimeSpan.Zero);

        var dictationManager = Substitute.For<IDictationSessionManager>();
        var dictationSession = new DictationSession { Id = dictationSessionId };
        dictationManager
            .Start(Arg.Any<string?>(), DictationSessionKind.Longform, Arg.Any<Guid?>())
            .Returns(dictationSession);

        using var factory = new RecordingMutationFactory(recorder, dictationManager);
        using var client = factory.CreateClient();

        var query = @"
mutation {
  startRecording {
    sessionId
    recordingId
    dictationSessionId
    outputPath
    errors {
      code
      message
    }
  }
}";
        var body = JsonSerializer.Serialize(new { query }, JsonOpts);
        using var content = new StringContent(body, Encoding.UTF8, "application/json");
        using var httpResponse = await client.PostAsync("/graphql", content);
        httpResponse.IsSuccessStatusCode.Should().BeTrue();

        var json = await httpResponse.Content.ReadAsStringAsync();
        var payload = JsonNode.Parse(json)!["data"]!["startRecording"]!;

        dictationManager.Received(1).Start(
            Arg.Any<string?>(),
            DictationSessionKind.Longform,
            Arg.Any<Guid?>());

        payload["errors"]!.AsArray().Should().BeEmpty();
        payload["dictationSessionId"]!.GetValue<string>().Should().Be(dictationSessionId.ToString());
        payload["sessionId"]!.GetValue<string?>().Should().NotBeNull();
    }

    [TestMethod]
    public async Task StopRecording_ReturnsNotFoundForUnknownSessionId()
    {
        var result = await ExecuteAsync(@"
mutation {
  stopRecording(sessionId: ""nonexistent-session"") {
    sessionId
    recordings {
      id
    }
    errors {
      code
      message
    }
  }
}");

        var payload = result["data"]!["stopRecording"]!;
        payload["errors"]!.AsArray().Should().HaveCount(1);
        payload["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task StopRecording_WhenSessionExists_CallsCancelAsyncOnDictationManager()
    {
        var dictationSessionId = Guid.NewGuid();

        var recorder = Substitute.For<IAudioRecorder>();
        recorder.IsSupported.Returns(true);
        recorder.IsRecording.Returns(false);
        recorder.CurrentDuration.Returns(TimeSpan.Zero);
        recorder.StopAsync(Arg.Any<CancellationToken>())
            .Returns(Path.GetTempFileName());

        var dictationManager = Substitute.For<IDictationSessionManager>();
        var dictationSession = new DictationSession { Id = dictationSessionId };
        dictationManager
            .Start(Arg.Any<string?>(), DictationSessionKind.Longform, Arg.Any<Guid?>())
            .Returns(dictationSession);

        using var factory = new RecordingMutationFactory(recorder, dictationManager);
        using var client = factory.CreateClient();

        var startQuery = @"mutation { startRecording { sessionId errors { code } } }";
        var startBody = JsonSerializer.Serialize(new { query = startQuery }, JsonOpts);
        using var startContent = new StringContent(startBody, Encoding.UTF8, "application/json");
        using var startResponse = await client.PostAsync("/graphql", startContent);
        var startJson = JsonNode.Parse(await startResponse.Content.ReadAsStringAsync())!;
        var sessionId = startJson["data"]!["startRecording"]!["sessionId"]!.GetValue<string>();

        var stopQuery = $@"mutation {{ stopRecording(sessionId: ""{sessionId}"") {{ sessionId recordings {{ id }} errors {{ code }} }} }}";
        var stopBody = JsonSerializer.Serialize(new { query = stopQuery }, JsonOpts);
        using var stopContent = new StringContent(stopBody, Encoding.UTF8, "application/json");
        await client.PostAsync("/graphql", stopContent);

        await dictationManager.Received(1).CancelAsync(dictationSessionId, Arg.Any<CancellationToken>());
    }
}

internal sealed class RecordingMutationFactory : WebApplicationFactory<Program>
{
    private readonly IAudioRecorder _recorder;
    private readonly IDictationSessionManager _dictationManager;

    public RecordingMutationFactory(
        IAudioRecorder recorder,
        IDictationSessionManager dictationManager)
    {
        _recorder = recorder;
        _dictationManager = dictationManager;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var dbPath = Path.Combine(Path.GetTempPath(), $"mozgoslav-rm-{Guid.NewGuid():N}.db");
        builder.UseEnvironment("IntegrationTest");
        builder.UseSetting("Mozgoslav:DatabasePath", dbPath);
        builder.UseSetting("Mozgoslav:PythonSidecar:BaseUrl", string.Empty);
        builder.ConfigureTestServices(services =>
        {
            ReplaceDbContext(services, dbPath);
            services.AddSingleton(_recorder);
            services.AddSingleton(_dictationManager);
        });
    }

    private static void ReplaceDbContext(IServiceCollection services, string databasePath)
    {
        var connectionString = $"Data Source={databasePath}";

        for (var i = services.Count - 1; i >= 0; i--)
        {
            var ns = services[i].ServiceType.Namespace;
            if (ns is not null && ns.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal))
            {
                services.RemoveAt(i);
            }
        }
        for (var i = services.Count - 1; i >= 0; i--)
        {
            if (services[i].ServiceType == typeof(MozgoslavDbContext))
            {
                services.RemoveAt(i);
            }
        }

        services.AddDbContextFactory<MozgoslavDbContext>(options => options.UseSqlite(connectionString));
        services.AddDbContext<MozgoslavDbContext>(
            options => options.UseSqlite(connectionString),
            contextLifetime: ServiceLifetime.Scoped,
            optionsLifetime: ServiceLifetime.Singleton);
    }
}
