using System.Linq;

using FluentAssertions;

using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// Plan v0.8 Block 5 — glossary projection helpers. Pure logic, no mocks.
/// </summary>
[TestClass]
public sealed class GlossaryApplicatorTests
{
    [TestMethod]
    public void TryBuildInitialPrompt_EmptyGlossary_ReturnsNull()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { Glossary = [] };
        applicator.TryBuildInitialPrompt(profile).Should().BeNull();
    }

    [TestMethod]
    public void TryBuildInitialPrompt_JoinsTermsWithCommaSpace()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { Glossary = { "Mozgoslav", "Мариной", "antony66" } };
        applicator.TryBuildInitialPrompt(profile).Should().Be("Mozgoslav, Мариной, antony66");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_DedupesAndStripsBlanks()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile
        {
            Glossary = { "Iván", " ", "Iván", "", "  Moscow  " },
        };
        applicator.TryBuildInitialPrompt(profile).Should().Be("Iván, Moscow");
    }

    [TestMethod]
    public void TryBuildInitialPrompt_TruncatesToSafeBudget()
    {
        var applicator = new GlossaryApplicator();
        var longTerms = Enumerable.Range(0, 200).Select(i => $"Term{i}").ToList();
        var profile = new Profile { Glossary = longTerms };
        var prompt = applicator.TryBuildInitialPrompt(profile);
        prompt.Should().NotBeNull();
        prompt!.Length.Should().BeLessThanOrEqualTo(200);
    }

    [TestMethod]
    public void TryBuildLlmSystemPromptSuffix_EmptyGlossary_ReturnsNull()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { Glossary = [] };
        applicator.TryBuildLlmSystemPromptSuffix(profile).Should().BeNull();
    }

    [TestMethod]
    public void TryBuildLlmSystemPromptSuffix_JoinsTermsVerbatimHint()
    {
        var applicator = new GlossaryApplicator();
        var profile = new Profile { Glossary = { "Mozgoslav", "antony66" } };
        var suffix = applicator.TryBuildLlmSystemPromptSuffix(profile);
        suffix.Should().Be("Proper nouns to preserve verbatim: Mozgoslav, antony66.");
    }
}
