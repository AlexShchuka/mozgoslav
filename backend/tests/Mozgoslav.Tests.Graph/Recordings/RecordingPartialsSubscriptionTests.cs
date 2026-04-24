using System;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Graph.Recordings;

[TestClass]
public sealed class RecordingPartialsSubscriptionTests : GraphTestsBase
{
    [TestMethod]
    public async Task DictationStart_WithRecordingId_CreatesLongformSession()
    {
        var recordingId = Guid.NewGuid();

        var result = await ExecuteAsync(
            "mutation { dictationStart(recordingId: \"" + recordingId + "\") { sessionId errors { code message } } }");

        result["data"]!["dictationStart"]!["errors"]!.AsArray().Should().BeEmpty();
        result["data"]!["dictationStart"]!["sessionId"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task RecordingPartialsNotifier_PublishAndSubscribe_DeliversPayload()
    {
        var recordingId = Guid.NewGuid();
        var notifier = Factory.Services.GetRequiredService<IRecordingPartialsNotifier>();

        var reader = notifier.SubscribeFor(recordingId);

        var payload = new RecordingPartialPayload(
            RecordingId: recordingId,
            SessionId: Guid.NewGuid(),
            Text: "transcribed text",
            StartSeconds: 0.0,
            EndSeconds: 1.5,
            IsFinal: false,
            ObservedAt: DateTimeOffset.UtcNow);

        notifier.Publish(payload);

        using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
        var received = await reader.ReadAsync(cts.Token);

        received.RecordingId.Should().Be(recordingId);
        received.Text.Should().Be("transcribed text");
        received.StartSeconds.Should().Be(0.0);
        received.EndSeconds.Should().Be(1.5);
        received.IsFinal.Should().BeFalse();
    }

}
