using FluentAssertions;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Application;

[TestClass]
public class CorrectionServiceTests
{
    private readonly CorrectionService _service = new();

    [TestMethod]
    public void Correct_WithNoneLevel_ReturnsTextAsIs()
    {
        var profile = new Profile { CleanupLevel = CleanupLevel.None };

        var result = _service.Correct("Ну вот это короче прикол", profile);

        result.Should().Be("Ну вот это короче прикол");
    }

    [TestMethod]
    public void Correct_WithLightLevel_RemovesFillers()
    {
        var profile = new Profile { CleanupLevel = CleanupLevel.Light };

        var result = _service.Correct("это просто короче пример", profile);

        result.Should().NotContain("короче");
        result.Should().Contain("пример");
    }

    [TestMethod]
    public void Correct_EmptyText_ReturnsEmpty()
    {
        var profile = new Profile { CleanupLevel = CleanupLevel.Aggressive };

        _service.Correct("", profile).Should().BeEmpty();
        _service.Correct("   ", profile).Should().BeEmpty();
    }

    [TestMethod]
    public void Correct_NullProfile_Throws()
    {
        FluentActions.Invoking(() => _service.Correct("x", null!))
            .Should().Throw<ArgumentNullException>();
    }
}
