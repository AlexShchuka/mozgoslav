using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.ValueObjects;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

[TestClass]
public sealed class DictationSessionSourceTests
{
    [TestMethod]
    public void StartAsync_WithSource_PersistsSourceTag()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start(source: "global-hotkey");

        session.Source.Should().Be("global-hotkey");
    }

    [TestMethod]
    public void StartAsync_WithMouse5Source_PersistsSourceTag()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start(source: "mouse5");

        session.Source.Should().Be("mouse5");
    }

    [TestMethod]
    public void StartAsync_WithDashboardSource_PersistsSourceTag()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start(source: "dashboard");

        session.Source.Should().Be("dashboard");
    }

    [TestMethod]
    public void StartAsync_WithoutSource_LeavesSourceNull()
    {
        var fixture = CreateFixture();
        var session = fixture.Manager.Start();

        session.Source.Should().BeNull(
            "legacy callers that omit the source continue to work — ADR-007 non-breaking contract");
    }

    private static Fixture CreateFixture()
    {
        var f = new Fixture();
        f.Settings.DictationLanguage.Returns("ru");
        f.Settings.DictationLlmPolish.Returns(false);
        f.Settings.DictationVocabulary.Returns<IReadOnlyList<string>>([]);
        f.PerAppProfiles.Resolve(Arg.Any<string?>()).Returns(PerAppCorrectionProfile.Empty);
        return f;
    }

    private sealed class Fixture
    {
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IPerAppCorrectionProfiles PerAppProfiles { get; } =
            Substitute.For<IPerAppCorrectionProfiles>();
        public FakeStreamingService Streaming { get; } = new();

        public FakeDictationPcmStream PcmStream { get; } = new();

        public DictationSessionManager Manager => field ??= new DictationSessionManager(
            Streaming,
            Llm,
            Settings,
            PerAppProfiles,
            PcmStream,
            NullLogger<DictationSessionManager>.Instance);
    }

    private sealed class FakeStreamingService : IStreamingTranscriptionService
    {
        public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
            IAsyncEnumerable<AudioChunk> chunks,
            string language,
            string? initialPrompt,
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var _ in chunks.WithCancellation(ct))
            {
            }
            yield break;
        }

        public Task<string> TranscribeSamplesAsync(
            float[] samples,
            string language,
            string? initialPrompt,
            CancellationToken ct) => Task.FromResult(string.Empty);
    }
}
