using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class LlmProviderFactoryIntegrationTests : IntegrationTestsBase
{
    [TestMethod]
    public async Task Factory_SwitchesOnSetting()
    {
        using var _ = CreateClient();

        using var scope = Factory.Services.CreateScope();
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
