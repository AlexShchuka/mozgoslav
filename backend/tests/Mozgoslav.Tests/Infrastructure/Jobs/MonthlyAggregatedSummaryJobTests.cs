using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Jobs;

using NSubstitute;

using Quartz;

namespace Mozgoslav.Tests.Infrastructure.Jobs;

[TestClass]
public sealed class MonthlyAggregatedSummaryJobTests
{
    private static IJobExecutionContext MakeContext(CancellationToken ct = default)
    {
        var ctx = Substitute.For<IJobExecutionContext>();
        ctx.CancellationToken.Returns(ct);
        return ctx;
    }

    private sealed class Fixture : IAsyncDisposable
    {
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();
        public ILlmService Llm { get; } = Substitute.For<ILlmService>();
        public IVaultDriver Vault { get; } = Substitute.For<IVaultDriver>();
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();

        private readonly ServiceProvider _provider;

        public Fixture()
        {
            Notes.GetByDateRangeAsync(Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
                .Returns([]);
            Llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);
            Settings.VaultPath.Returns("/tmp/test-vault");

            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton(Notes);
            services.AddSingleton(Llm);
            services.AddSingleton(Vault);
            services.AddSingleton(Settings);
            services.AddScoped<AggregateSummaryUseCase>();
            _provider = services.BuildServiceProvider();
        }

        public MonthlyAggregatedSummaryJob BuildJob()
        {
            return new MonthlyAggregatedSummaryJob(
                _provider.GetRequiredService<IServiceScopeFactory>(),
                NullLogger<MonthlyAggregatedSummaryJob>.Instance);
        }

        public async ValueTask DisposeAsync()
        {
            await _provider.DisposeAsync();
        }
    }

    [TestMethod]
    public async Task Execute_NullContext_ThrowsArgumentNullException()
    {
        await using var fixture = new Fixture();
        var job = fixture.BuildJob();

        var act = async () => await job.Execute(null!);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task Execute_NoNotesInPeriod_DoesNotWriteToVault()
    {
        await using var fixture = new Fixture();
        fixture.Notes.GetByDateRangeAsync(Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns([]);

        var job = fixture.BuildJob();
        await job.Execute(MakeContext());

        await fixture.Vault.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
    }

    [TestMethod]
    public async Task Execute_WithNotes_WritesAggregatedSummaryToVault()
    {
        await using var fixture = new Fixture();

        var note = new Mozgoslav.Domain.Entities.ProcessedNote
        {
            MarkdownContent = "Team discussed deployment",
            CreatedAt = DateTime.UtcNow
        };

        fixture.Notes.GetByDateRangeAsync(Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns([note]);
        fixture.Vault.EnsureFolderAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        fixture.Vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(new VaultWriteReceipt("aggregated/x.md", "abc", 10L, VaultWriteAction.Created));

        var job = fixture.BuildJob();
        await job.Execute(MakeContext());

        await fixture.Vault.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath.StartsWith("aggregated/")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task Execute_VaultPathBlank_SkipsWithoutException()
    {
        await using var fixture = new Fixture();
        fixture.Settings.VaultPath.Returns(string.Empty);
        fixture.Notes.GetByDateRangeAsync(Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns([new Mozgoslav.Domain.Entities.ProcessedNote { MarkdownContent = "x" }]);

        var job = fixture.BuildJob();
        var act = async () => await job.Execute(MakeContext());

        await act.Should().NotThrowAsync();
        await fixture.Vault.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
    }

    [TestMethod]
    public async Task Execute_PeriodLabelMatchesCurrentMonth()
    {
        await using var fixture = new Fixture();

        string? capturedPath = null;
        fixture.Notes.GetByDateRangeAsync(Arg.Any<DateTimeOffset>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns([new Mozgoslav.Domain.Entities.ProcessedNote { MarkdownContent = "note" }]);
        fixture.Vault.EnsureFolderAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        fixture.Vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                capturedPath = ci.ArgAt<VaultNoteWrite>(0).VaultRelativePath;
                return new VaultWriteReceipt(capturedPath ?? string.Empty, "abc", 5L, VaultWriteAction.Created);
            });

        var job = fixture.BuildJob();
        await job.Execute(MakeContext());

        var now = DateTimeOffset.UtcNow;
        var expectedLabel = $"monthly-{now.Year:D4}-{now.Month:D2}";
        capturedPath.Should().Contain(expectedLabel);
    }
}
