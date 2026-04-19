using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// BC-036 — the composition root resolves <see cref="ILlmProviderFactory"/> and
/// returns a provider whose <c>Kind</c> matches the persisted setting. This
/// exercises the whole DI wiring: three <see cref="ILlmProvider"/> singletons,
/// the factory, and the settings load path.
/// </summary>
[TestClass]
public sealed class LlmProviderFactoryIntegrationTests
{
    [TestMethod]
    public async Task Factory_SwitchesOnSetting()
    {
        await using var factory = new ApiFactory();
        using var _ = factory.CreateClient();

        using var scope = factory.Services.CreateScope();
        var providerFactory = scope.ServiceProvider.GetRequiredService<ILlmProviderFactory>();
        var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();

        await settings.SaveAsync(settings.Snapshot with { LlmProvider = "openai_compatible" }, CancellationToken.None);
        var def = await providerFactory.GetCurrentAsync(CancellationToken.None);
        def.Kind.Should().Be("openai_compatible");

        await settings.SaveAsync(settings.Snapshot with { LlmProvider = "anthropic" }, CancellationToken.None);
        var anthropic = await providerFactory.GetCurrentAsync(CancellationToken.None);
        anthropic.Kind.Should().Be("anthropic");

        await settings.SaveAsync(settings.Snapshot with { LlmProvider = "ollama" }, CancellationToken.None);
        var ollama = await providerFactory.GetCurrentAsync(CancellationToken.None);
        ollama.Kind.Should().Be("ollama");

        await settings.SaveAsync(settings.Snapshot with { LlmProvider = "groq" }, CancellationToken.None);
        var fallback = await providerFactory.GetCurrentAsync(CancellationToken.None);
        fallback.Kind.Should().Be("openai_compatible");
    }
}
