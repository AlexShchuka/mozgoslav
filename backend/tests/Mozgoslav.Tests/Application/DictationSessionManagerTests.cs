using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;
using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class DictationSessionManagerTests
{
    [TestMethod]
    public void Start_WhenIdle_ReturnsNewSessionInRecordingState()
    {
        var fixture = new Fixture();
        fixture.ArrangeEmptyStream();

        var session = fixture.Manager.Start();

        session.Id.Should().NotBeEmpty();
        session.State.Should().Be(DictationState.Recording);
        session.StartedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
    }

    [TestMethod]
    public void Start_WhenSessionAlreadyActive_Throws()
    {
        var fixture = new Fixture();
        fixture.ArrangeEmptyStream();
        fixture.Manager.Start();

        var act = fixture.Manager.Start;

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*already active*");
    }

    [TestMethod]
    public async Task PushAudioAsync_ChunkReachesStreamingService()
    {
        var fixture = new Fixture();
        var sink = fixture.ArrangeEmptyStream();
        var session = fixture.Manager.Start();

        var chunk = new AudioChunk(new float[1600], 16_000, TimeSpan.Zero);
        await fixture.Manager.PushAudioAsync(session.Id, chunk, CancellationToken.None);
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        sink.Chunks.Should().ContainSingle();
    }

    [TestMethod]
    public async Task PushAudioAsync_UnknownSession_Throws()
    {
        var fixture = new Fixture();
        fixture.ArrangeEmptyStream();

        var act = async () => await fixture.Manager.PushAudioAsync(
            Guid.NewGuid(),
            new AudioChunk([], 16_000, TimeSpan.Zero),
            CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [TestMethod]
    public async Task StopAsync_WhenLlmPolishDisabled_ReturnsRawTextBoth()
    {
        var fixture = new Fixture { LlmPolish = false };
        fixture.ArrangeStreamWithPartial("Проверка связи");
        var session = fixture.Manager.Start();

        var final = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        final.RawText.Should().Be("Проверка связи");
        final.PolishedText.Should().Be("Проверка связи");
        await fixture.Llm.DidNotReceive().ProcessAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task StopAsync_WhenLlmPolishEnabledAndAvailable_ReturnsPolishedText()
    {
        var fixture = new Fixture { LlmPolish = true };
        fixture.ArrangeStreamWithPartial("привет как дела");
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fixture.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "Привет, как дела?",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: string.Empty,
                ConversationType: ConversationType.Other,
                Tags: []));

        var session = fixture.Manager.Start();
        var final = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        final.RawText.Should().Be("привет как дела");
        final.PolishedText.Should().Be("Привет, как дела?");
    }

    [TestMethod]
    public async Task StopAsync_WhenLlmPolishEnabledButLlmUnavailable_ReturnsRawText()
    {
        var fixture = new Fixture { LlmPolish = true };
        fixture.ArrangeStreamWithPartial("тест");
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);

        var session = fixture.Manager.Start();
        var final = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        final.RawText.Should().Be("тест");
        final.PolishedText.Should().Be("тест");
        await fixture.Llm.DidNotReceive().ProcessAsync(
            Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task StopAsync_WhenLlmPolishThrows_FallsBackToRawText()
    {
        var fixture = new Fixture { LlmPolish = true };
        fixture.ArrangeStreamWithPartial("кейс ошибки");
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fixture.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<LlmProcessingResult>(_ => throw new HttpRequestException("endpoint down"));

        var session = fixture.Manager.Start();
        var final = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        final.PolishedText.Should().Be("кейс ошибки");
    }

    [TestMethod]
    public async Task CancelAsync_ForActiveSession_RemovesSessionAndClearsActive()
    {
        var fixture = new Fixture();
        fixture.ArrangeEmptyStream();
        var session = fixture.Manager.Start();

        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.Manager.TryGet(session.Id).Should().BeNull();
        var restarted = fixture.Manager.Start();
        restarted.Id.Should().NotBe(session.Id);
    }

    [TestMethod]
    public async Task CancelAsync_ForUnknownSession_Noop()
    {
        var fixture = new Fixture();
        var act = async () => await fixture.Manager.CancelAsync(Guid.NewGuid(), CancellationToken.None);
        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task StopAsync_AfterCancel_Throws()
    {
        var fixture = new Fixture();
        fixture.ArrangeEmptyStream();
        var session = fixture.Manager.Start();
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        var act = async () => await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [TestMethod]
    public async Task SubscribePartialsAsync_YieldsPartialsEmittedByStreamingService()
    {
        var fixture = new Fixture();
        fixture.ArrangeStreamWithPartial("живой текст");
        var session = fixture.Manager.Start();

        // Start the subscriber *before* stopping so the session still exists when
        // the enumerator subscribes to its partials channel.
        var enumerator = fixture.Manager
            .SubscribePartialsAsync(session.Id, CancellationToken.None)
            .GetAsyncEnumerator(TestContext.CancellationToken);

        try
        {
            var partials = new List<PartialTranscript>();
            var drainTask = Task.Run(async () =>
            {
                while (await enumerator.MoveNextAsync())
                {
                    partials.Add(enumerator.Current);
                }
            }, TestContext.CancellationToken);

            await fixture.Manager.StopAsync(session.Id, CancellationToken.None);
            await drainTask;

            partials.Should().ContainSingle();
            partials[0].Text.Should().Be("живой текст");
        }
        finally
        {
            await enumerator.DisposeAsync();
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
            [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
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
    }

    private sealed class Fixture
    {
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public FakeStreamingService Streaming { get; } = new();
        public bool LlmPolish { get; init; }

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            Streaming,
            Llm,
            Settings,
            NullLogger<DictationSessionManager>.Instance);

        public FakeStreamingService ArrangeEmptyStream()
        {
            Settings.DictationLanguage.Returns("ru");
            Settings.DictationLlmPolish.Returns(LlmPolish);
            return Streaming;
        }

        public void ArrangeStreamWithPartial(string text)
        {
            ArrangeEmptyStream();
            Streaming.Partials.Add(new PartialTranscript(text, TimeSpan.FromSeconds(1)));
        }
    }

    public TestContext TestContext { get; set; }
}
