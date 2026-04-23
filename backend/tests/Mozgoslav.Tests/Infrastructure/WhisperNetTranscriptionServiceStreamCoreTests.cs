using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class WhisperNetTranscriptionServiceStreamCoreTests
{
    private const int SampleRate = 16_000;

    [TestMethod]
    public async Task StreamCore_EmptyStream_YieldsNothing_AndDoesNotTranscribe()
    {
        var vad = AlwaysSpeech();
        var transcribeCalls = 0;
        Task<string> Transcribe(float[] _, CancellationToken __)
        {
            transcribeCalls++;
            return Task.FromResult(string.Empty);
        }

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync([]),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        partials.Should().BeEmpty();
        transcribeCalls.Should().Be(0);
    }

    [TestMethod]
    public async Task StreamCore_VadRejectsAllChunks_NoTranscription_NoPartials()
    {
        var vad = Substitute.For<IVadPreprocessor>();
        vad.ContainsSpeech(Arg.Any<AudioChunk>()).Returns(false);
        var transcribeCalls = 0;
        Task<string> Transcribe(float[] _, CancellationToken __)
        {
            transcribeCalls++;
            return Task.FromResult("should not call");
        }

        var chunks = Enumerable.Range(0, 20)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        partials.Should().BeEmpty();
        transcribeCalls.Should().Be(0);
    }

    [TestMethod]
    public async Task StreamCore_TailOnlyPath_TranscribesBufferAndYieldsSinglePartial()
    {
        var vad = AlwaysSpeech();
        var capturedLengths = new List<int>();
        Task<string> Transcribe(float[] samples, CancellationToken __)
        {
            capturedLengths.Add(samples.Length);
            return Task.FromResult("tail-text");
        }

        var chunks = Enumerable.Range(0, 4)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        capturedLengths.Should().ContainSingle();
        capturedLengths[0].Should().Be(4000);
        partials.Should().ContainSingle();
        partials[0].Text.Should().Be("tail-text");
    }

    [TestMethod]
    public async Task StreamCore_EmitWindowReached_TranscribesAndYieldsCommittedText()
    {
        var vad = AlwaysSpeech();
        var transcribeCalls = 0;
        Task<string> Transcribe(float[] _, CancellationToken __)
        {
            transcribeCalls++;
            return Task.FromResult("hello");
        }

        var chunks = Enumerable.Range(0, 5)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        transcribeCalls.Should().BeGreaterOrEqualTo(1);
        partials.Should().NotBeEmpty();
        partials.Should().AllSatisfy(p => p.Text.Should().Contain("hello"));
    }

    [TestMethod]
    public async Task StreamCore_TranscribeReturnsEmpty_ClearsBufferAndYieldsNothing()
    {
        var vad = AlwaysSpeech();
        var callLengths = new List<int>();
        Task<string> Transcribe(float[] samples, CancellationToken __)
        {
            callLengths.Add(samples.Length);
            return Task.FromResult(string.Empty);
        }

        var chunks = Enumerable.Range(0, 10)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        callLengths.Should().HaveCount(2);
        callLengths.Should().AllSatisfy(n => n.Should().Be(5000));
        partials.Should().BeEmpty();
    }

    [TestMethod]
    public async Task StreamCore_CommittedTextAccumulatesAcrossEmitsAndTail()
    {
        var vad = AlwaysSpeech();
        var callIndex = 0;
        string[] outputs = ["first", "second", "third"];
        Task<string> Transcribe(float[] _, CancellationToken __)
        {
            var text = outputs[Math.Min(callIndex, outputs.Length - 1)];
            callIndex++;
            return Task.FromResult(text);
        }

        var chunks = Enumerable.Range(0, 14)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        partials.Should().HaveCount(3);
        partials[0].Text.Should().Be("first");
        partials[1].Text.Should().Be("first second");
        partials[2].Text.Should().Be("first second third");
    }

    [TestMethod]
    public async Task StreamCore_BufferCapReached_UsesCommitPathNotEmitPath()
    {
        var vad = AlwaysSpeech();
        var callLengths = new List<int>();
        Task<string> Transcribe(float[] samples, CancellationToken __)
        {
            callLengths.Add(samples.Length);
            return Task.FromResult("cap-text");
        }

        var oneChunk = new AudioChunk(SpeechSamples(241_000), SampleRate, TimeSpan.Zero);

        var partials = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync([oneChunk]),
            vad,
            Transcribe,
            onEmitWindow: null,
            NullLogger.Instance,
            CancellationToken.None));

        callLengths.Should().ContainSingle();
        callLengths[0].Should().Be(241_000);
        partials.Should().ContainSingle();
        partials[0].Text.Should().Be("cap-text");
    }

    [TestMethod]
    public async Task StreamCore_EmitWindowHook_InvokedOnEachEmit()
    {
        var vad = AlwaysSpeech();
        var hookCount = 0;
        void Hook()
        {
            hookCount++;
        }
        static Task<string> Transcribe(float[] _, CancellationToken __)
        {
            return Task.FromResult("t");
        }

        var chunks = Enumerable.Range(0, 10)
            .Select(_ => new AudioChunk(SpeechSamples(1000), SampleRate, TimeSpan.Zero));

        _ = await Collect(WhisperNetTranscriptionService.StreamCoreAsync(
            ToAsync(chunks),
            vad,
            Transcribe,
            onEmitWindow: Hook,
            NullLogger.Instance,
            CancellationToken.None));

        hookCount.Should().Be(2);
    }

    [TestMethod]
    public async Task StreamCore_WrongSampleRate_Throws()
    {
        var vad = AlwaysSpeech();
        static Task<string> Transcribe(float[] _, CancellationToken __)
        {
            return Task.FromResult(string.Empty);
        }

        var chunk = new AudioChunk(SpeechSamples(1000), 48_000, TimeSpan.Zero);

        var act = async () =>
        {
            await foreach (var _ in WhisperNetTranscriptionService.StreamCoreAsync(
                ToAsync([chunk]),
                vad,
                Transcribe,
                onEmitWindow: null,
                NullLogger.Instance,
                CancellationToken.None))
            {
            }
        };

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    private static IVadPreprocessor AlwaysSpeech()
    {
        var vad = Substitute.For<IVadPreprocessor>();
        vad.ContainsSpeech(Arg.Any<AudioChunk>()).Returns(true);
        return vad;
    }

    private static float[] SpeechSamples(int length)
    {
        var samples = new float[length];
        for (var i = 0; i < length; i++)
        {
            samples[i] = 0.1f;
        }
        return samples;
    }

    private static async IAsyncEnumerable<AudioChunk> ToAsync(IEnumerable<AudioChunk> items)
    {
        foreach (var item in items)
        {
            await Task.Yield();
            yield return item;
        }
    }

    private static async Task<List<PartialTranscript>> Collect(IAsyncEnumerable<PartialTranscript> stream)
    {
        var list = new List<PartialTranscript>();
        await foreach (var p in stream)
        {
            list.Add(p);
        }
        return list;
    }
}
