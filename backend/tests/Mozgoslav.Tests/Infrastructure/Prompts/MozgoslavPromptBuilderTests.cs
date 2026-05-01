using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Rag;
using Mozgoslav.Application.WebSearch;
using Mozgoslav.Infrastructure.Prompts;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Prompts;

[TestClass]
public sealed class MozgoslavPromptBuilderTests
{
    private sealed class Fixture
    {
        public IRagService RagService { get; } = Substitute.For<IRagService>();
        public IWebSearch WebSearch { get; } = Substitute.For<IWebSearch>();

        public MozgoslavPromptBuilder BuildSut() =>
            new(RagService, WebSearch, NullLogger<MozgoslavPromptBuilder>.Instance);
    }

    [TestMethod]
    public async Task BuildAsync_NoPlaceholders_ReturnsTemplateUnchanged()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.BuildAsync("Hello world", new Dictionary<string, string>(), CancellationToken.None);

        result.Should().Be("Hello world");
    }

    [TestMethod]
    public async Task BuildAsync_ContextKeyReplaced_SubstitutesValue()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();
        var context = new Dictionary<string, string> { ["name"] = "Alice" };

        var result = await sut.BuildAsync("Hello {name}!", context, CancellationToken.None);

        result.Should().Be("Hello Alice!");
    }

    [TestMethod]
    public async Task BuildAsync_UnknownPlaceholder_LeftUnchanged()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.BuildAsync("{unknown}", new Dictionary<string, string>(), CancellationToken.None);

        result.Should().Be("{unknown}");
    }

    [TestMethod]
    public async Task BuildAsync_PlaceholderWithArgs_LeftUnchangedWhenUnknown()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.BuildAsync("{action(arg1)}", new Dictionary<string, string>(), CancellationToken.None);

        result.Should().Be("{action(arg1)}");
    }

    [TestMethod]
    public async Task BuildAsync_MultipleContextKeys_ReplacesAll()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();
        var context = new Dictionary<string, string>
        {
            ["first"] = "FIRST",
            ["second"] = "SECOND"
        };

        var result = await sut.BuildAsync("A={first} B={second}", context, CancellationToken.None);

        result.Should().Be("A=FIRST B=SECOND");
    }

    [TestMethod]
    public async Task BuildAsync_NullTemplate_ThrowsArgumentNullException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.BuildAsync(null!, new Dictionary<string, string>(), CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task BuildAsync_NullContext_ThrowsArgumentNullException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.BuildAsync("template", null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task BuildAsync_ContextAndPlaceholder_ContextReplacesThenUnknownLeft()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();
        var context = new Dictionary<string, string> { ["greeting"] = "Hi" };

        var result = await sut.BuildAsync("{greeting} {stranger}", context, CancellationToken.None);

        result.Should().StartWith("Hi ");
        result.Should().Contain("{stranger}");
    }

    [TestMethod]
    public async Task BuildAsync_EmptyTemplate_ReturnsEmpty()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.BuildAsync(string.Empty, new Dictionary<string, string>(), CancellationToken.None);

        result.Should().BeEmpty();
    }
}
