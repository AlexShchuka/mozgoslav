using FluentAssertions;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public class AudioFormatDetectorTests
{
    [Theory]
    [InlineData(".mp3", AudioFormat.Mp3)]
    [InlineData(".MP3", AudioFormat.Mp3)]
    [InlineData("m4a", AudioFormat.M4a)]
    [InlineData(".wav", AudioFormat.Wav)]
    [InlineData(".mp4", AudioFormat.Mp4)]
    [InlineData(".ogg", AudioFormat.Ogg)]
    [InlineData(".flac", AudioFormat.Flac)]
    [InlineData(".webm", AudioFormat.Webm)]
    [InlineData(".aac", AudioFormat.Aac)]
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
