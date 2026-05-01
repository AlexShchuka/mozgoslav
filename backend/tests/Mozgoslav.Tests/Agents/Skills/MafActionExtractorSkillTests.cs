using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Agents.Skills;

using NSubstitute;

namespace Mozgoslav.Tests.Agents.Skills;

[TestClass]
public sealed class MafActionExtractorSkillTests
{
    private static IAgentRunner MakeRunner(string answer)
    {
        var runner = Substitute.For<IAgentRunner>();
        runner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns(new AgentRunResult(answer, [], [], true));
        return runner;
    }

    private static IProcessedNoteRepository MakeNotes(Guid noteId, string content, string title = "Test Note")
    {
        var repo = Substitute.For<IProcessedNoteRepository>();
        var note = new ProcessedNote
        {
            Id = noteId,
            Title = title,
            MarkdownContent = content,
            CreatedAt = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc)
        };
        repo.GetByIdAsync(noteId, Arg.Any<CancellationToken>()).Returns(note);
        return repo;
    }

    private static IVaultDriver MakeVault()
    {
        var vault = Substitute.For<IVaultDriver>();
        vault.WriteNoteAsync(Arg.Any<VaultNoteWrite>(), Arg.Any<CancellationToken>())
            .Returns(ci => new VaultWriteReceipt(
                ci.ArgAt<VaultNoteWrite>(0).VaultRelativePath,
                "abc", 10L, VaultWriteAction.Created));
        return vault;
    }

    private static IAppSettings MakeSettings(bool remindersEnabled = false)
    {
        var settings = Substitute.For<IAppSettings>();
        settings.RemindersSkillEnabled.Returns(remindersEnabled);
        return settings;
    }

    [TestMethod]
    public async Task ExtractAsync_WellFormedTranscript_WritesActionsToVault()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("[{\"title\":\"Buy milk\",\"due_iso\":null}]");
        var notes = MakeNotes(noteId, "Meeting notes: buy milk today");
        var vault = MakeVault();
        var settings = MakeSettings();
        var remindersSkill = Substitute.For<IRemindersSkill>();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, settings, remindersSkill,
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(noteId, CancellationToken.None);

        await vault.Received(1).WriteNoteAsync(
            Arg.Is<VaultNoteWrite>(w => w.Body.Contains("Buy milk")),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExtractAsync_NoteNotFound_DoesNotCallAgentRunner()
    {
        var runner = Substitute.For<IAgentRunner>();
        var notes = Substitute.For<IProcessedNoteRepository>();
        notes.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((ProcessedNote?)null);

        var sut = new MafActionExtractorSkill(
            runner, notes, MakeVault(), MakeSettings(), Substitute.For<IRemindersSkill>(),
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(Guid.NewGuid(), CancellationToken.None);

        await runner.DidNotReceiveWithAnyArgs().RunAsync(default!, default);
    }

    [TestMethod]
    public async Task ExtractAsync_MalformedLlmResponse_ReturnsGracefully_NoExceptionEscapes()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("not json at all {{garbage}}");
        var notes = MakeNotes(noteId, "Some content");
        var vault = MakeVault();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, MakeSettings(), Substitute.For<IRemindersSkill>(),
            NullLogger<MafActionExtractorSkill>.Instance);

        var act = async () => await sut.ExtractAsync(noteId, CancellationToken.None);

        await act.Should().NotThrowAsync();
        await vault.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
    }

    [TestMethod]
    public async Task ExtractAsync_EmptyJsonArray_DoesNotWriteVaultNote()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("[]");
        var notes = MakeNotes(noteId, "content");
        var vault = MakeVault();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, MakeSettings(), Substitute.For<IRemindersSkill>(),
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(noteId, CancellationToken.None);

        await vault.DidNotReceiveWithAnyArgs().WriteNoteAsync(default!, default);
    }

    [TestMethod]
    public async Task ExtractAsync_AgentRunnerThrows_DoesNotPropagateException()
    {
        var noteId = Guid.NewGuid();
        var runner = Substitute.For<IAgentRunner>();
        runner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns<AgentRunResult>(_ => throw new InvalidOperationException("network error"));

        var notes = MakeNotes(noteId, "content");

        var sut = new MafActionExtractorSkill(
            runner, notes, MakeVault(), MakeSettings(), Substitute.For<IRemindersSkill>(),
            NullLogger<MafActionExtractorSkill>.Instance);

        var act = async () => await sut.ExtractAsync(noteId, CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task ExtractAsync_CancellationRequested_PropagatesCancellation()
    {
        var noteId = Guid.NewGuid();
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var runner = Substitute.For<IAgentRunner>();
        runner.RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>())
            .Returns<AgentRunResult>(_ => throw new OperationCanceledException(cts.Token));

        var notes = MakeNotes(noteId, "content");

        var sut = new MafActionExtractorSkill(
            runner, notes, MakeVault(), MakeSettings(), Substitute.For<IRemindersSkill>(),
            NullLogger<MafActionExtractorSkill>.Instance);

        var act = async () => await sut.ExtractAsync(noteId, cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    [TestMethod]
    public async Task ExtractAsync_RemindersEnabled_CallsRemindersSkillWhenActionsFound()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("[{\"title\":\"Call Alice\",\"due_iso\":\"2026-05-01\"}]");
        var notes = MakeNotes(noteId, "content");
        var vault = MakeVault();
        var settings = MakeSettings(remindersEnabled: true);
        var remindersSkill = Substitute.For<IRemindersSkill>();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, settings, remindersSkill,
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(noteId, CancellationToken.None);

        await remindersSkill.Received(1).CreateAsync(
            Arg.Is<IReadOnlyList<ActionItem>>(list => list.Count == 1),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ExtractAsync_RemindersDisabled_DoesNotCallRemindersSkill()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("[{\"title\":\"Do something\",\"due_iso\":null}]");
        var notes = MakeNotes(noteId, "content");
        var vault = MakeVault();
        var settings = MakeSettings(remindersEnabled: false);
        var remindersSkill = Substitute.For<IRemindersSkill>();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, settings, remindersSkill,
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(noteId, CancellationToken.None);

        await remindersSkill.DidNotReceiveWithAnyArgs().CreateAsync(default!, default);
    }

    [TestMethod]
    public async Task ExtractAsync_IdempotencyPath_SecondCallSkipsProcessing()
    {
        var noteId = Guid.NewGuid();
        var runner = MakeRunner("[{\"title\":\"Do task\",\"due_iso\":null}]");
        var notes = MakeNotes(noteId, "content");
        var vault = MakeVault();
        var settings = MakeSettings();
        var remindersSkill = Substitute.For<IRemindersSkill>();

        var sut = new MafActionExtractorSkill(
            runner, notes, vault, settings, remindersSkill,
            NullLogger<MafActionExtractorSkill>.Instance);

        await sut.ExtractAsync(noteId, CancellationToken.None);
        await sut.ExtractAsync(noteId, CancellationToken.None);

        await runner.Received(1).RunAsync(Arg.Any<AgentRunRequest>(), Arg.Any<CancellationToken>());

        var doneFile = Path.Combine(Path.GetTempPath(), "mozgoslav-actions-processed", $"{noteId:D}.done");
        if (File.Exists(doneFile)) File.Delete(doneFile);
    }
}
