using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Services;

[TestClass]
public sealed class LlmProviderFactoryTests
{
    private static ILlmProvider MakeProvider(string kind)
    {
        var p = Substitute.For<ILlmProvider>();
        p.Kind.Returns(kind);
        return p;
    }

    private static IAppSettings MakeSettings(string provider = "openai_compatible", string model = "global-model")
    {
        var s = Substitute.For<IAppSettings>();
        s.LlmProvider.Returns(provider);
        s.LlmModel.Returns(model);
        return s;
    }

    [TestMethod]
    public async Task GetForProfileAsync_ProfileHasBothOverrides_ReturnsOverrideProvider()
    {
        var openai = MakeProvider("openai_compatible");
        var anthropic = MakeProvider("anthropic");
        var settings = MakeSettings();
        var factory = new LlmProviderFactory(
            [openai, anthropic],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var profile = new Profile { LlmProviderOverride = "anthropic", LlmModelOverride = "claude-3-opus" };

        var result = await factory.GetForProfileAsync(profile, CancellationToken.None);

        result.Should().BeSameAs(anthropic);
    }

    [TestMethod]
    public async Task GetForProfileAsync_ProfileHasEmptyOverrides_ReturnsGlobalProvider()
    {
        var openai = MakeProvider("openai_compatible");
        var settings = MakeSettings("openai_compatible");
        var factory = new LlmProviderFactory(
            [openai],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var profile = new Profile { LlmProviderOverride = string.Empty, LlmModelOverride = string.Empty };

        var result = await factory.GetForProfileAsync(profile, CancellationToken.None);

        result.Should().BeSameAs(openai);
    }

    [TestMethod]
    public async Task GetForProfileAsync_ProfileHasOnlyProviderOverride_ReturnsOverrideProvider()
    {
        var openai = MakeProvider("openai_compatible");
        var ollama = MakeProvider("ollama");
        var settings = MakeSettings("openai_compatible");
        var factory = new LlmProviderFactory(
            [openai, ollama],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var profile = new Profile { LlmProviderOverride = "ollama", LlmModelOverride = string.Empty };

        var result = await factory.GetForProfileAsync(profile, CancellationToken.None);

        result.Should().BeSameAs(ollama);
    }
}
