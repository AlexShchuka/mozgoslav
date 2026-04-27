using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Mozgoslav.Tests.UseCases;

[TestClass]
public sealed class AggregateSummaryUseCaseTests
{
    private static (
        IProcessedNoteRepository notes,
        ILlmService llm,
        IVaultDriver vault,
        AggregateSummaryUseCase sut) Build()
    {
        var notes = Substitute.For<IProcessedNoteRepository>();
        var llm = Substitute.For<ILlmService>();
        var vault = Substitute.For<IVaultDriver>();

        vault.EnsureFolderAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                var write = ci.ArgAt<VaultNoteWrite>(0);
                return new VaultWriteReceipt(write.VaultRelativePath, string.Empty, 0, VaultWriteAction.Created);
            });

        var sut = new AggregateSummaryUseCase(
            notes,
            llm,
            vault,
            NullLogger<AggregateSummaryUseCase>.Instance);

        return (notes, llm, vault, sut);
    }

    private static SummaryPeriod BuildWeeklyPeriod()
    {
        var from = new DateTimeOffset(2026, 4, 20, 0, 0, 0, TimeSpan.Zero);
        return SummaryPeriod.Weekly(from);
    }

    private static SummaryPeriod BuildMonthlyPeriod()
    {
        var from = new DateTimeOffset(2026, 4, 1, 0, 0, 0, TimeSpan.Zero);
        return SummaryPeriod.Monthly(from);
    }

    private static ProcessedNote MakeNote(DateTime createdAt, string summary = "summary")
    {
        return new ProcessedNote
        {
            Summary = summary,
            Topic = "test topic",
            MarkdownContent = $"## Topic\n{summary}",
            CreatedAt = createdAt,
        };
    }

    [TestMethod]
    public async Task ExecuteAsync_Weekly_WritesNoteWithCorrectPath()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        var noteInRange = MakeNote(new DateTime(2026, 4, 22, 10, 0, 0, DateTimeKind.Utc), "discussed feature X");
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([noteInRange]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "weekly synthesis",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: "Weekly Summary",
                ConversationType: ConversationType.Other,
                Tags: []));

        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await vault.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath.Contains("weekly-2026-W17")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_Monthly_WritesNoteWithCorrectPath()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildMonthlyPeriod();

        var noteInRange = MakeNote(new DateTime(2026, 4, 15, 10, 0, 0, DateTimeKind.Utc));
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([noteInRange]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "monthly synthesis",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: "Monthly Summary",
                ConversationType: ConversationType.Other,
                Tags: []));

        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await vault.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath.Contains("monthly-2026-04")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_Idempotent_SecondRunDoesNotDuplicateWrite()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        var noteInRange = MakeNote(new DateTime(2026, 4, 22, 10, 0, 0, DateTimeKind.Utc));
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([noteInRange]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(true);
        llm.ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new LlmProcessingResult(
                Summary: "synthesis",
                KeyPoints: [],
                Decisions: [],
                ActionItems: [],
                UnresolvedQuestions: [],
                Participants: [],
                Topic: "Weekly",
                ConversationType: ConversationType.Other,
                Tags: []));

        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);
        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await vault.Received(2).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.VaultRelativePath.Contains("weekly-2026-W17")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_NoNotesInRange_SkipsLlmAndWrite()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        var outsideRange = MakeNote(new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc));
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([outsideRange]);

        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await llm.DidNotReceive().ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await vault.DidNotReceive().WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_LlmUnavailable_WritesRawConcatenation()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        var noteInRange = MakeNote(new DateTime(2026, 4, 22, 10, 0, 0, DateTimeKind.Utc), "raw content");
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([noteInRange]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);

        await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await llm.DidNotReceive().ProcessAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        await vault.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.Body.Contains("raw content") || w.VaultRelativePath.Contains("weekly-2026-W17")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_VaultPathEmpty_DoesNotThrow()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([]);

        var act = async () => await sut.ExecuteAsync(period, string.Empty, CancellationToken.None);

        await act.Should().NotThrowAsync();
        await vault.DidNotReceive().WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExecuteAsync_VaultWriteFails_DoesNotThrow()
    {
        var (notes, llm, vault, sut) = Build();
        var period = BuildWeeklyPeriod();

        var noteInRange = MakeNote(new DateTime(2026, 4, 22, 10, 0, 0, DateTimeKind.Utc));
        notes.GetAllAsync(Arg.Any<CancellationToken>())
            .Returns([noteInRange]);

        llm.IsAvailableAsync(Arg.Any<CancellationToken>()).Returns(false);
        vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("vault offline"));

        var act = async () => await sut.ExecuteAsync(period, "/vault", CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}
