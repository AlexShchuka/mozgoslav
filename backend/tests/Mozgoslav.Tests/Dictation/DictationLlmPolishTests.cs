using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.Dictation;

[TestClass]
public sealed class DictationLlmPolishTests
{
    [TestMethod]
    public async Task StopAsync_WhenClassifyIntentEnabled_AndLlmReturnsCommand_InvokesSystemActionAndReturnsEmpty()
    {
        var fixture = new Fixture { LlmPolish = true, ClassifyIntentEnabled = true };
        fixture.Settings.DictationClassifyIntentEnabled.Returns(true);
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fixture.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "COMMAND\nACTION:Mozgoslav: Add reminder|Call Vasya on Friday|2026-05-02",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: string.Empty,
                ConversationType: ConversationType.Other,
                Tags: []));
        fixture.SystemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(new SystemActionResult(true, null, null));

        var stream = fixture.ArrangeStream(rawText: "Напомни в пятницу позвонить Васе");
        var session = fixture.Manager.Start();
        await fixture.Manager.PushAudioAsync(session.Id, stream.Chunk, CancellationToken.None);
        var result = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        result.PolishedText.Should().BeEmpty();
        await fixture.SystemAction.Received(1).InvokeAsync(
            "Mozgoslav: Add reminder",
            Arg.Is<IReadOnlyDictionary<string, string>>(d =>
                d["title"] == "Call Vasya on Friday" && d["due"] == "2026-05-02"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task StopAsync_WhenClassifyIntentEnabled_AndLlmReturnsDictation_PolishesAndReturnsText()
    {
        var fixture = new Fixture { LlmPolish = true, ClassifyIntentEnabled = true };
        fixture.Settings.DictationClassifyIntentEnabled.Returns(true);
        fixture.Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        fixture.Llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(
                new LlmProcessingResult(
                    Summary: "DICTATION",
                    KeyPoints: [],
                    Decisions: [],
                    ActionItems: [],
                    UnresolvedQuestions: [],
                    Participants: [],
                    Topic: string.Empty,
                    ConversationType: ConversationType.Other,
                    Tags: []),
                new LlmProcessingResult(
                    Summary: "Просто пишу заметку.",
                    KeyPoints: [],
                    Decisions: [],
                    ActionItems: [],
                    UnresolvedQuestions: [],
                    Participants: [],
                    Topic: string.Empty,
                    ConversationType: ConversationType.Other,
                    Tags: []));

        var stream = fixture.ArrangeStream(rawText: "просто пишу заметку");
        var session = fixture.Manager.Start();
        await fixture.Manager.PushAudioAsync(session.Id, stream.Chunk, CancellationToken.None);
        var result = await fixture.Manager.StopAsync(session.Id, CancellationToken.None);

        result.PolishedText.Should().Be("Просто пишу заметку.");
        await fixture.SystemAction.DidNotReceive().InvokeAsync(
            Arg.Any<string>(),
            Arg.Any<IReadOnlyDictionary<string, string>>(),
            Arg.Any<CancellationToken>());
    }

    private sealed class FakeStreamingService : IStreamingTranscriptionService
    {
        private readonly string _rawText;

        public FakeStreamingService(string rawText)
        {
            _rawText = rawText;
        }

        public AudioChunk Chunk { get; } = new(new float[1600], 16_000, TimeSpan.Zero);

        public async Task<string> TranscribeSamplesAsync(
            float[] samples,
            string lang,
            string? initialPrompt,
            CancellationToken ct)
        {
            await Task.Yield();
            return _rawText;
        }

        public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
            IAsyncEnumerable<AudioChunk> audio,
            string lang,
            string? initialPrompt,
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var _ in audio.WithCancellation(ct))
            {
            }
            yield break;
        }
    }

    private sealed class Fixture
    {
        public bool LlmPolish { get; init; }
        public bool ClassifyIntentEnabled { get; init; }

        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public ISystemAction SystemAction { get; } = Substitute.For<ISystemAction>();
        private readonly IPerAppCorrectionProfiles _perAppProfiles = Substitute.For<IPerAppCorrectionProfiles>();

        private FakeStreamingService? _streaming;

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            _streaming!,
            Llm,
            Settings,
            _perAppProfiles,
            Substitute.For<IDictationPcmStream>(),
            Substitute.For<IRecordingPartialsNotifier>(),
            SystemAction,
            NullLogger<DictationSessionManager>.Instance);

        public FakeStreamingService ArrangeStream(string rawText)
        {
            _streaming = new FakeStreamingService(rawText);
            Settings.DictationLanguage.Returns("ru");
            Settings.DictationLlmPolish.Returns(LlmPolish);
            Settings.DictationClassifyIntentEnabled.Returns(ClassifyIntentEnabled);
            Settings.DictationVocabulary.Returns(Array.Empty<string>());
            _perAppProfiles.Resolve(Arg.Any<string?>()).Returns(PerAppCorrectionProfile.Empty);
            return _streaming;
        }
    }
}
