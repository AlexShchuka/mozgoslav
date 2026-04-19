using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// D4 — Dashboard record button posts Opus-in-WebM chunks. The session
/// manager forwards each raw chunk to the long-running PCM decoder; the
/// resulting samples flow into the same streaming transcription pipeline as
/// PCM pushed from the Electron native path.
/// </summary>
[TestClass]
public sealed class DictationRawChunkPipelineTests
{
    [TestMethod]
    public async Task PushRawChunkAsync_StartsPcmStreamOnce_AndForwardsDecodedSamples()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start();

        await fixture.Manager.PushRawChunkAsync(
            session.Id,
            [1, 2, 3, 4], CancellationToken.None);
        await fixture.Manager.PushRawChunkAsync(
            session.Id,
            [5, 6, 7, 8], CancellationToken.None);

        await WaitForAsync(() => fixture.Streaming.Chunks.Count >= 2, TimeSpan.FromSeconds(2));
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.PcmStream.StartedSessions.Should().ContainSingle(
            "the long-running ffmpeg decoder is spun up once per session, not once per chunk");
        fixture.Streaming.Chunks.Count.Should().BeGreaterOrEqualTo(2,
            "every decoded chunk must reach the streaming transcription service");
        fixture.Streaming.Chunks[0].SampleRate.Should().Be(fixture.PcmStream.TargetSampleRate,
            "the decoder normalises to the Whisper streaming rate");
    }

    [TestMethod]
    public async Task PushRawChunkAsync_UnknownSession_Throws()
    {
        var fixture = CreateFixture();

        var act = async () => await fixture.Manager.PushRawChunkAsync(
            Guid.NewGuid(),
            [1], CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [TestMethod]
    public async Task StopAsync_DrainsPcmStreamBeforeCompletingAudioChannel()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start();

        await fixture.Manager.PushRawChunkAsync(
            session.Id,
            [10, 20, 30], CancellationToken.None);

        await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        fixture.PcmStream.StoppedSessions.Should().Contain(session.Id,
            "the session manager must flush the decoder so lingering PCM reaches transcription");
        fixture.Streaming.Chunks.Should().NotBeEmpty(
            "decoded samples emitted before stop must survive the drain");
    }

    [TestMethod]
    public async Task CancelAsync_KillsPcmStreamWithoutDrain()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start();

        await fixture.Manager.PushRawChunkAsync(
            session.Id, [42], CancellationToken.None);
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.PcmStream.CancelledSessions.Should().Contain(session.Id);
        fixture.PcmStream.StoppedSessions.Should().NotContain(session.Id,
            "cancel is a hard abort — the graceful drain path is reserved for stop");
    }

    [TestMethod]
    public async Task PushRawChunkAsync_DoesNotStartStreamForPcmOnlySessions()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start();

        await fixture.Manager.PushAudioAsync(
            session.Id,
            new AudioChunk(new float[16], 16_000, TimeSpan.Zero),
            CancellationToken.None);
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.PcmStream.StartedSessions.Should().BeEmpty(
            "sessions that never see a WebM chunk must not spawn the ffmpeg process");
    }

    private static Fixture CreateFixture()
    {
        var f = new Fixture();
        f.Settings.DictationLanguage.Returns("ru");
        f.Settings.DictationLlmPolish.Returns(false);
        f.Settings.DictationVocabulary.Returns<IReadOnlyList<string>>([]);
        f.PerAppProfiles.Resolve(Arg.Any<string?>()).Returns(PerAppCorrectionProfile.Empty);
        return f;
    }

    private static async Task WaitForAsync(Func<bool> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (!predicate() && DateTime.UtcNow < deadline)
        {
            await Task.Delay(25);
        }
        if (!predicate())
        {
            throw new TimeoutException($"Condition not reached within {timeout}");
        }
    }

    private sealed class Fixture
    {
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IPerAppCorrectionProfiles PerAppProfiles { get; } =
            Substitute.For<IPerAppCorrectionProfiles>();
        public FakeStreamingService Streaming { get; } = new();
        public FakeDictationPcmStream PcmStream { get; } = new();

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            Streaming,
            Llm,
            Settings,
            PerAppProfiles,
            PcmStream,
            NullLogger<DictationSessionManager>.Instance);
    }

    private sealed class FakeStreamingService : IStreamingTranscriptionService
    {
        public List<AudioChunk> Chunks { get; } = [];

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
            yield break;
        }
    }
}
