using FluentAssertions;

using Mozgoslav.Infrastructure.SystemActions;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class AppleShortcutTemplateProviderTests
{
    [TestMethod]
    public void GetTemplates_returns_three_default_shortcuts()
    {
        var sut = new AppleShortcutTemplateProvider();

        var templates = sut.GetTemplates();

        templates.Should().HaveCount(3);
    }

    [TestMethod]
    public void GetTemplates_each_template_has_non_empty_name_description_deeplink()
    {
        var sut = new AppleShortcutTemplateProvider();

        var templates = sut.GetTemplates();

        foreach (var t in templates)
        {
            t.Name.Should().NotBeNullOrWhiteSpace();
            t.Description.Should().NotBeNullOrWhiteSpace();
            t.DeeplinkUrl.Should().NotBeNullOrWhiteSpace();
        }
    }

    [TestMethod]
    public void GetTemplates_deeplinks_start_with_shortcuts_scheme()
    {
        var sut = new AppleShortcutTemplateProvider();

        var templates = sut.GetTemplates();

        foreach (var t in templates)
        {
            t.DeeplinkUrl.Should().StartWith("shortcuts://");
        }
    }
}
