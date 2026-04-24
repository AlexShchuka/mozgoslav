using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
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

        var act = () => fixture.Manager.Start();

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
        await WaitForAsync(() => sink.Chunks.Count >= 1, TimeSpan.FromSeconds(2));
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
    public async Task StopAsync_WithBundleId_AppliesGlossaryAndAppendsSystemPromptSuffix()
    {
        var fixture = new Fixture { LlmPolish = true };
        fixture.ArrangeStreamWithPartial("привет мозгслав");
        fixture.PerAppProfiles.Resolve("com.tinyspeck.slackmacgap").Returns(
            new PerAppCorrectionProfile(
                "com.tinyspeck.slackmacgap",
                "Контекст: Slack — деловая переписка.",
                new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    ["мозгслав"] = "Mozgoslav"
                }));
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fixture.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "Привет, Mozgoslav.",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: string.Empty,
                ConversationType: ConversationType.Other,
                Tags: []));

        var session = fixture.Manager.Start();
        var final = await fixture.Manager.StopAsync(
            session.Id, CancellationToken.None, bundleId: "com.tinyspeck.slackmacgap");

        final.RawText.Should().Be("привет мозгслав",
            "RawText preserves the untouched Whisper output");
        final.PolishedText.Should().Be("Привет, Mozgoslav.");
        await fixture.Llm.Received(1).ProcessAsync(
            Arg.Is<string>(s => s.Contains("Mozgoslav", StringComparison.Ordinal)
                             && !s.Contains("мозгслав", StringComparison.Ordinal)),
            Arg.Is<string>(p => p.Contains("Slack", StringComparison.Ordinal)),
            Arg.Any<CancellationToken>());
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
    public async Task Start_PassesDictationVocabularyToStreamingAsInitialPrompt()
    {
        var fixture = new Fixture();
        fixture.Settings.DictationVocabulary.Returns(
            ["Mozgoslav", "scenarios", "LRT", "кафка"]);
        fixture.ArrangeEmptyStream();

        var session = fixture.Manager.Start();
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.Streaming.InitialPrompt.Should().NotBeNull();
        fixture.Streaming.InitialPrompt.Should().Contain("Mozgoslav");
        fixture.Streaming.InitialPrompt.Should().Contain("кафка");
    }

    [TestMethod]
    public void BuildInitialPrompt_PrefersProfileOverride_OverVocabulary()
    {
        var profile = new Profile
        {
            TranscriptionPromptOverride = "Код-ревью, рефакторинг, архитектура сервисов.",
        };
        var vocabulary = new[] { "Mozgoslav", "кафка" };

        var prompt = DictationSessionManager.BuildInitialPrompt(profile, vocabulary);

        prompt.Should().Be("Код-ревью, рефакторинг, архитектура сервисов.",
            "BC-030 / N3 — profile override wins over settings vocabulary");
        prompt.Should().NotContain("Mozgoslav");
        prompt.Should().NotContain("кафка");
    }

    [TestMethod]
    public void BuildInitialPrompt_WhenProfileOverrideEmpty_FallsBackToVocabulary()
    {
        var profile = new Profile
        {
            TranscriptionPromptOverride = string.Empty,
        };
        var vocabulary = new[] { "Mozgoslav", "LRT" };

        var prompt = DictationSessionManager.BuildInitialPrompt(profile, vocabulary);

        prompt.Should().NotBeNull();
        prompt.Should().Contain("Mozgoslav");
        prompt.Should().Contain("LRT");
    }

    [TestMethod]
    public void BuildInitialPrompt_WhenProfileOverrideWhitespace_FallsBackToVocabulary()
    {
        var profile = new Profile
        {
            TranscriptionPromptOverride = "   \t  ",
        };
        var vocabulary = new[] { "термин" };

        var prompt = DictationSessionManager.BuildInitialPrompt(profile, vocabulary);

        prompt.Should().Be("термин");
    }

    [TestMethod]
    public void BuildInitialPrompt_WhenProfileNull_UsesVocabulary()
    {
        var vocabulary = new[] { "fallback" };

        var prompt = DictationSessionManager.BuildInitialPrompt(profile: null, vocabulary);

        prompt.Should().Be("fallback");
    }

    [TestMethod]
    public async Task Start_WithoutVocabulary_PassesNullInitialPrompt()
    {
        var fixture = new Fixture();
        fixture.Settings.DictationVocabulary.Returns([]);
        fixture.ArrangeEmptyStream();

        var session = fixture.Manager.Start();
        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        fixture.Streaming.InitialPrompt.Should().BeNull(
            "empty vocabulary must not override Whisper's default domain prompt");
    }

    [TestMethod]
    public async Task PushAudio_WithConfiguredTempPath_WritesPcmBytes()
    {
        using var tempDir = TempAudioDir.Create();
        var fixture = new Fixture();
        fixture.Settings.DictationTempAudioPath.Returns(tempDir.Path);
        var sink = fixture.ArrangeEmptyStream();
        var session = fixture.Manager.Start();

        var samples = new[] { 0.10f, 0.20f, 0.30f };
        await fixture.Manager.PushAudioAsync(
            session.Id, new AudioChunk(samples, 16_000, TimeSpan.Zero), CancellationToken.None);

        await WaitForAsync(() => sink.Chunks.Count >= 1, TimeSpan.FromSeconds(2));

        var pcmPath = Directory.EnumerateFiles(tempDir.Path, "dictation-*.pcm").Single();
        pcmPath.Should().Contain(session.Id.ToString());
        var bytes = await File.ReadAllBytesAsync(pcmPath);
        bytes.Length.Should().Be(samples.Length * sizeof(float));
        BitConverter.ToSingle(bytes.AsSpan(0, 4)).Should().BeApproximately(0.10f, 0.0001f);

        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);
    }

    [TestMethod]
    public async Task StopAsync_DeletesAudioBufferFile()
    {
        using var tempDir = TempAudioDir.Create();
        var fixture = new Fixture();
        fixture.Settings.DictationTempAudioPath.Returns(tempDir.Path);
        fixture.ArrangeStreamWithPartial("ok");
        var session = fixture.Manager.Start();

        await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        Directory.EnumerateFiles(tempDir.Path, "dictation-*.pcm").Should().BeEmpty();
    }

    [TestMethod]
    public async Task CancelAsync_DeletesAudioBufferFile()
    {
        using var tempDir = TempAudioDir.Create();
        var fixture = new Fixture();
        fixture.Settings.DictationTempAudioPath.Returns(tempDir.Path);
        fixture.ArrangeEmptyStream();
        var session = fixture.Manager.Start();
        await WaitForAsync(
            () => Directory.EnumerateFiles(tempDir.Path, "dictation-*.pcm").Any(),
            TimeSpan.FromSeconds(2));

        await fixture.Manager.CancelAsync(session.Id, CancellationToken.None);

        Directory.EnumerateFiles(tempDir.Path, "dictation-*.pcm").Should().BeEmpty();
    }

    [TestMethod]
    public async Task SubscribePartialsAsync_YieldsPartialsEmittedByStreamingService()
    {
        var fixture = new Fixture();
        fixture.ArrangeStreamWithPartial("живой текст");
        var session = fixture.Manager.Start();

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
        public List<float> SamplesReceived { get; } = [];
        public string? InitialPrompt { get; private set; }

        public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
            IAsyncEnumerable<AudioChunk> chunks,
            string language,
            string? initialPrompt,
            [EnumeratorCancellation] CancellationToken ct)
        {
            InitialPrompt = initialPrompt;
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
            InitialPrompt = initialPrompt;
            SamplesReceived.AddRange(samples);
            return Task.FromResult(Partials.LastOrDefault()?.Text ?? string.Empty);
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
        public bool LlmPolish { get; init; }

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            Streaming,
            Llm,
            Settings,
            PerAppProfiles,
            PcmStream,
            NullLogger<DictationSessionManager>.Instance);

        public FakeStreamingService ArrangeEmptyStream()
        {
            Settings.DictationLanguage.Returns("ru");
            Settings.DictationLlmPolish.Returns(LlmPolish);
            PerAppProfiles.Resolve(Arg.Any<string?>()).Returns(PerAppCorrectionProfile.Empty);
            return Streaming;
        }

        public void ArrangeStreamWithPartial(string text)
        {
            ArrangeEmptyStream();
            Streaming.Partials.Add(new PartialTranscript(text, TimeSpan.FromSeconds(1)));
        }
    }

    public required TestContext TestContext { get; set; }

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

    private sealed class TempAudioDir : IDisposable
    {
        public string Path { get; }
        private TempAudioDir(string path) => Path = path;

        public static TempAudioDir Create()
        {
            var path = System.IO.Path.Combine(
                System.IO.Path.GetTempPath(),
                "mozgoslav-tests-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(path);
            return new TempAudioDir(path);
        }

        public void Dispose()
        {
            try
            {
                if (Directory.Exists(Path))
                {
                    Directory.Delete(Path, recursive: true);
                }
            }
            catch (IOException)
            {
            }
        }
    }
}
