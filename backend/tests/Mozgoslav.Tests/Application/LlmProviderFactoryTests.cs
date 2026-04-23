using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class LlmProviderFactoryTests
{
    [TestMethod]
    public async Task Factory_Default_ReturnsOpenAiCompatible()
    {
        var openAi = NewProvider("openai_compatible");
        var anthropic = NewProvider("anthropic");
        var ollama = NewProvider("ollama");
        var settings = Substitute.For<IAppSettings>();
        settings.LlmProvider.Returns("openai_compatible");

        var factory = new LlmProviderFactory(
            [openAi, anthropic, ollama],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var provider = await factory.GetCurrentAsync(CancellationToken.None);

        provider.Should().BeSameAs(openAi);
    }

    [TestMethod]
    public async Task Factory_Anthropic_ReturnsAnthropicProvider()
    {
        var openAi = NewProvider("openai_compatible");
        var anthropic = NewProvider("anthropic");
        var settings = Substitute.For<IAppSettings>();
        settings.LlmProvider.Returns("anthropic");

        var factory = new LlmProviderFactory(
            [openAi, anthropic],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var provider = await factory.GetCurrentAsync(CancellationToken.None);

        provider.Should().BeSameAs(anthropic);
    }

    [TestMethod]
    public async Task Factory_Ollama_ReturnsOllamaProvider()
    {
        var openAi = NewProvider("openai_compatible");
        var ollama = NewProvider("ollama");
        var settings = Substitute.For<IAppSettings>();
        settings.LlmProvider.Returns("ollama");

        var factory = new LlmProviderFactory(
            [openAi, ollama],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var provider = await factory.GetCurrentAsync(CancellationToken.None);

        provider.Should().BeSameAs(ollama);
    }

    [TestMethod]
    public async Task Factory_UnknownValue_LogsWarn_FallsBackToDefault()
    {
        var openAi = NewProvider("openai_compatible");
        var anthropic = NewProvider("anthropic");
        var settings = Substitute.For<IAppSettings>();
        settings.LlmProvider.Returns("groq");
        var logger = new ListLogger<LlmProviderFactory>();

        var factory = new LlmProviderFactory(
            [openAi, anthropic],
            settings,
            logger);

        var provider = await factory.GetCurrentAsync(CancellationToken.None);

        provider.Should().BeSameAs(openAi);
        logger.WarnMessages.Should().ContainSingle(m => m.Contains("groq", StringComparison.OrdinalIgnoreCase));
    }

    [TestMethod]
    public async Task Factory_EmptyValue_FallsBackToDefaultSilently()
    {
        var openAi = NewProvider("openai_compatible");
        var settings = Substitute.For<IAppSettings>();
        settings.LlmProvider.Returns(string.Empty);

        var factory = new LlmProviderFactory(
            [openAi],
            settings,
            NullLogger<LlmProviderFactory>.Instance);

        var provider = await factory.GetCurrentAsync(CancellationToken.None);

        provider.Should().BeSameAs(openAi);
    }

    private static ILlmProvider NewProvider(string kind)
    {
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns(kind);
        return provider;
    }

    private sealed class ListLogger<T> : ILogger<T>
    {
        public List<string> WarnMessages { get; } = [];

        IDisposable? ILogger.BeginScope<TState>(TState state) => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (logLevel == LogLevel.Warning)
            {
                WarnMessages.Add(formatter(state, exception));
            }
        }
    }
}
