using FluentAssertions;
using Mozgoslav.Infrastructure.Seed;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public class BuiltInProfilesTests
{
    [TestMethod]
    public void All_ContainsThreeProfiles()
    {
        BuiltInProfiles.All.Should().HaveCount(3);
        BuiltInProfiles.All.Should().Contain(p => p.Name == "Рабочий");
        BuiltInProfiles.All.Should().Contain(p => p.Name == "Неформальный");
        BuiltInProfiles.All.Should().Contain(p => p.Name == "Полная заметка");
    }

    [TestMethod]
    public void All_ExactlyOneIsDefault()
    {
        BuiltInProfiles.All.Where(p => p.IsDefault).Should().HaveCount(1);
    }

    [TestMethod]
    public void All_AreMarkedBuiltIn()
    {
        BuiltInProfiles.All.Should().OnlyContain(p => p.IsBuiltIn);
    }

    [TestMethod]
    public void All_HaveStableIds()
    {
        var first = BuiltInProfiles.Work.Id;
        var second = BuiltInProfiles.Work.Id;
        first.Should().Be(second);
    }
}
