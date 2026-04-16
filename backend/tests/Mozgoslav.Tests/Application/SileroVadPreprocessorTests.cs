using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Services;
using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class SileroVadPreprocessorTests
{
    [TestMethod]
    public void ContainsSpeech_ForSilence_ReturnsFalse()
    {
        var preprocessor = BuildPreprocessor();

        // 1 second of true silence at 16 kHz.
        var chunk = new AudioChunk(new float[16_000], 16_000, TimeSpan.Zero);

        preprocessor.ContainsSpeech(chunk).Should().BeFalse();
    }

    [TestMethod]
    public void ContainsSpeech_ForSineToneAboveThreshold_ReturnsTrue()
    {
        var preprocessor = BuildPreprocessor();

        var samples = new float[16_000];
        for (int i = 0; i < samples.Length; i++)
        {
            // Amplitude 0.3 — well above the 0.005 RMS gate.
            samples[i] = 0.3f * MathF.Sin(2f * MathF.PI * 440f * i / 16_000f);
        }
        var chunk = new AudioChunk(samples, 16_000, TimeSpan.Zero);

        preprocessor.ContainsSpeech(chunk).Should().BeTrue();
    }

    [TestMethod]
    public void ContainsSpeech_ForVeryShortChunk_ReturnsFalse()
    {
        var preprocessor = BuildPreprocessor();

        // Below the minimum-samples guard — classifier refuses to judge.
        var samples = new float[32];
        Array.Fill(samples, 0.5f);
        var chunk = new AudioChunk(samples, 16_000, TimeSpan.Zero);

        preprocessor.ContainsSpeech(chunk).Should().BeFalse();
    }

    [TestMethod]
    public void ContainsSpeech_ForLowAmplitudeBackgroundNoise_ReturnsFalse()
    {
        var preprocessor = BuildPreprocessor();

        var samples = new float[16_000];
        for (int i = 0; i < samples.Length; i++)
        {
            // Low-amplitude dither (< 0.005 RMS) — below the speech gate.
            samples[i] = 0.001f * MathF.Sin(2f * MathF.PI * 60f * i / 16_000f);
        }
        var chunk = new AudioChunk(samples, 16_000, TimeSpan.Zero);

        preprocessor.ContainsSpeech(chunk).Should().BeFalse();
    }

    [TestMethod]
    public void ContainsSpeech_NullChunk_Throws()
    {
        var preprocessor = BuildPreprocessor();
        var act = () => preprocessor.ContainsSpeech(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    private static SileroVadPreprocessor BuildPreprocessor()
    {
        var settings = Substitute.For<IAppSettings>();
        settings.VadModelPath.Returns(string.Empty);
        return new SileroVadPreprocessor(settings, NullLogger<SileroVadPreprocessor>.Instance);
    }
}
