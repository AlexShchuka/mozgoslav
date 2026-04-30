using System.Linq;

using FluentAssertions;

using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class GlossaryApplicatorTests
{
    [TestMethod]
    public void TryBuildInitialPrompt_EmptyGlossary_ReturnsNull()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { GlossaryByLanguage = [] };
        applicator.TryBuildInitialPrompt(profile).Should().BeNull();
    }

    [TestMethod]
    public void TryBuildInitialPrompt_MatchesExactLanguage_ReturnsTerms()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            GlossaryByLanguage = new()
            {
                ["ru"] = ["Mozgoslav", "Мариной", "antony66"],
            },
        };
        applicator.TryBuildInitialPrompt(profile, "ru").Should().Be("Mozgoslav, Мариной, antony66");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_FallsBackToDefault_WhenLanguageNotFound()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            GlossaryByLanguage = new()
            {
                ["default"] = ["Iván", "Moscow"],
            },
        };
        applicator.TryBuildInitialPrompt(profile, "fr").Should().Be("Iván, Moscow");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_DedupesAndStripsBlanks()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            GlossaryByLanguage = new()
            {
                ["en"] = ["Iván", " ", "Iván", "", "  Moscow  "],
            },
        };
        applicator.TryBuildInitialPrompt(profile, "en").Should().Be("Iván, Moscow");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_TruncatesToSafeBudget()
    {
        var applicator = new GlossaryApplicator();
        var longTerms = Enumerable.Range(0, 200).Select(i => $"Term{i}").ToList();
        var profile = new Profile { GlossaryByLanguage = new() { ["ru"] = longTerms } };
        var prompt = applicator.TryBuildInitialPrompt(profile, "ru");
        prompt.Should().NotBeNull();
        prompt.Length.Should().BeLessThanOrEqualTo(200);
    }

    [TestMethod]
    public void TryBuildLlmSystemPromptSuffix_EmptyGlossary_ReturnsNull()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { GlossaryByLanguage = [] };
        applicator.TryBuildLlmSystemPromptSuffix(profile).Should().BeNull();
    }

    [TestMethod]
    public void TryBuildLlmSystemPromptSuffix_JoinsTermsVerbatimHint()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            GlossaryByLanguage = new()
            {
                ["en"] = ["Mozgoslav", "antony66"],
            },
        };
        var suffix = applicator.TryBuildLlmSystemPromptSuffix(profile, "en");
        suffix.Should().Be("Proper nouns to preserve verbatim: Mozgoslav, antony66.");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_NoLanguageGiven_ReturnsNull_WhenNoDefault()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            GlossaryByLanguage = new()
            {
                ["ru"] = ["Mozgoslav"],
            },
        };
        applicator.TryBuildInitialPrompt(profile, null).Should().BeNull();
    }
}
