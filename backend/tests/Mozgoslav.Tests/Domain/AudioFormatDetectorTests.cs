using FluentAssertions;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public sealed class AudioFormatDetectorTests
{
    [TestMethod]
    [DataRow(".mp3", AudioFormat.Mp3)]
    [DataRow(".MP3", AudioFormat.Mp3)]
    [DataRow("m4a", AudioFormat.M4A)]
    [DataRow(".wav", AudioFormat.Wav)]
    [DataRow(".mp4", AudioFormat.Mp4)]
    [DataRow(".ogg", AudioFormat.Ogg)]
    [DataRow(".flac", AudioFormat.Flac)]
    [DataRow(".webm", AudioFormat.Webm)]
    [DataRow(".aac", AudioFormat.Aac)]
    public void FromExtension_KnownFormat_ReturnsExpectedEnum(string extension, AudioFormat expected)
    {
        var result = AudioFormatDetector.FromExtension(extension);
        result.Should().Be(expected);
    }

    [TestMethod]
    public void FromExtension_UnknownFormat_Throws()
    {
        var act = () => AudioFormatDetector.FromExtension(".xyz");
        act.Should().Throw<ArgumentException>();
    }

    [TestMethod]
    public void TryFromExtension_Unknown_ReturnsFalse()
    {
        var success = AudioFormatDetector.TryFromExtension(".xyz", out _);
        success.Should().BeFalse();
    }
}
