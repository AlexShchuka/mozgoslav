using FluentAssertions;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public class FillerCleanerTests
{
    [TestMethod]
    public void Clean_NoneLevel_ReturnsOriginalText()
    {
        const string input = "ну типа эээ что-то там";
        var result = FillerCleaner.Clean(input, CleanupLevel.None);
        result.Should().Be(input);
    }

    [TestMethod]
    public void Clean_LightLevel_RemovesBasicFillers()
    {
        const string input = "ну давай уже сделаем это типа быстро, эээ.";
        var result = FillerCleaner.Clean(input, CleanupLevel.Light);

        result.Should().NotContain("ну");
        result.Should().NotContain("типа");
        result.Should().NotContain("эээ");
        result.Should().Contain("давай");
        result.Should().Contain("сделаем");
    }

    [TestMethod]
    public void Clean_AggressiveLevel_RemovesMultiwordFillers()
    {
        const string input = "ну вот смотри, ну это важно.";
        var result = FillerCleaner.Clean(input, CleanupLevel.Aggressive);

        result.Should().NotContain("ну вот");
        result.Should().NotContain("ну это");
        result.Should().Contain("смотри");
        result.Should().Contain("важно");
    }

    [TestMethod]
    public void Clean_EmptyString_ReturnsUnchanged()
    {
        var result = FillerCleaner.Clean(string.Empty, CleanupLevel.Aggressive);
        result.Should().Be(string.Empty);
    }
}
