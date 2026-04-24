using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class DictationSessionManager_LongformTests
{
    [TestMethod]
    public async Task LongformKind_PublishesPartialsToNotifier_WhenRecordingIdSet()
    {
        var notifier = new CapturingPartialsNotifier();
        var recordingId = Guid.NewGuid();
        var partial = new PartialTranscript("hello world", TimeSpan.FromSeconds(1));
        var fixture = new Fixture(notifier, partial);
        fixture.ArrangeStream();

        var session = fixture.Manager.Start(
            source: null,
            kind: DictationSessionKind.Longform,
            recordingId: recordingId);

        var chunk = new AudioChunk(new float[1600], 16_000, TimeSpan.Zero);
        await fixture.Manager.PushAudioAsync(session.Id, chunk, CancellationToken.None);
        await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        await WaitForAsync(
            () => notifier.Published.Count >= 1,
            TimeSpan.FromSeconds(5));

        notifier.Published.Should().ContainSingle(p =>
            p.RecordingId == recordingId &&
            p.SessionId == session.Id &&
            p.Text == "hello world");
    }

    [TestMethod]
    public async Task DictationKind_DoesNotPublishToRecordingNotifier()
    {
        var notifier = new CapturingPartialsNotifier();
        var partial = new PartialTranscript("dictation text", TimeSpan.FromSeconds(1));
        var fixture = new Fixture(notifier, partial);
        fixture.ArrangeStream();

        var session = fixture.Manager.Start(source: null);

        var chunk = new AudioChunk(new float[1600], 16_000, TimeSpan.Zero);
        await fixture.Manager.PushAudioAsync(session.Id, chunk, CancellationToken.None);
        await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        await Task.Delay(200);

        notifier.Published.Should().BeEmpty(
            "dictation kind must not publish to the recording partials notifier");
    }

    [TestMethod]
    public async Task LongformKind_StopAsync_ReturnsEmptyTranscript()
    {
        var notifier = new CapturingPartialsNotifier();
        var fixture = new Fixture(notifier, null);
        fixture.ArrangeStream();

        var session = fixture.Manager.Start(
            source: null,
            kind: DictationSessionKind.Longform,
            recordingId: Guid.NewGuid());

        var result = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        result.RawText.Should().BeEmpty();
        result.PolishedText.Should().BeEmpty();
    }

    [TestMethod]
    public async Task LongformKind_WithNullRecordingId_DoesNotPublishToNotifier()
    {
        var notifier = new CapturingPartialsNotifier();
        var partial = new PartialTranscript("text", TimeSpan.FromSeconds(1));
        var fixture = new Fixture(notifier, partial);
        fixture.ArrangeStream();

        var session = fixture.Manager.Start(
            source: null,
            kind: DictationSessionKind.Longform,
            recordingId: null);

        var chunk = new AudioChunk(new float[1600], 16_000, TimeSpan.Zero);
        await fixture.Manager.PushAudioAsync(session.Id, chunk, CancellationToken.None);
        await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        await Task.Delay(200);

        notifier.Published.Should().BeEmpty();
    }

    private static async Task WaitForAsync(Func<bool> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (!predicate() && DateTime.UtcNow < deadline)
        {
            await Task.Delay(25);
        }
        predicate().Should().BeTrue($"condition not reached within {timeout}");
    }

    private sealed class CapturingPartialsNotifier : IRecordingPartialsNotifier
    {
        public List<RecordingPartialPayload> Published { get; } = [];
        private readonly Channel<RecordingPartialPayload> _channel =
            Channel.CreateUnbounded<RecordingPartialPayload>();

        public ChannelReader<RecordingPartialPayload> SubscribeFor(Guid recordingId) => _channel.Reader;

        public void Publish(RecordingPartialPayload payload)
        {
            Published.Add(payload);
            _channel.Writer.TryWrite(payload);
        }
    }

    private sealed class Fixture
    {
        private readonly CapturingPartialsNotifier _notifier;
        private readonly PartialTranscript? _partial;

        public Fixture(CapturingPartialsNotifier notifier, PartialTranscript? partial)
        {
            _notifier = notifier;
            _partial = partial;
        }

        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IPerAppCorrectionProfiles PerAppProfiles { get; } =
            Substitute.For<IPerAppCorrectionProfiles>();
        private FakeStreamingService Streaming { get; } = new();
        private FakeDictationPcmStream PcmStream { get; } = new();

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            Streaming,
            Llm,
            Settings,
            PerAppProfiles,
            PcmStream,
            _notifier,
            NullLogger<DictationSessionManager>.Instance);

        public void ArrangeStream()
        {
            Settings.DictationLanguage.Returns("ru");
            Settings.DictationLlmPolish.Returns(false);
            PerAppProfiles.Resolve(Arg.Any<string?>()).Returns(PerAppCorrectionProfile.Empty);
            if (_partial is not null)
            {
                Streaming.Partials.Add(_partial);
            }
        }

        private sealed class FakeStreamingService : IStreamingTranscriptionService
        {
            public List<AudioChunk> Chunks { get; } = [];
            public List<PartialTranscript> Partials { get; } = [];

            public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
                IAsyncEnumerable<AudioChunk> chunks,
                string language,
                string? initialPrompt,
                [EnumeratorCancellation] CancellationToken ct)
            {
                await foreach (var chunk in chunks.WithCancellation(ct))
                {
                    Chunks.Add(chunk);
                }
                foreach (var partial in Partials)
                {
                    yield return partial;
                }
            }

            public Task<string> TranscribeSamplesAsync(
                float[] samples,
                string language,
                string? initialPrompt,
                CancellationToken ct)
            {
                return Task.FromResult(Partials.LastOrDefault()?.Text ?? string.Empty);
            }
        }
    }

    public required TestContext TestContext { get; set; }
}
