using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Agents.Skills;

using NSubstitute;

namespace Mozgoslav.Tests.Agents.Skills;

[TestClass]
public sealed class RemindersSkillTests
{
    private static RemindersSkill MakeSut(ISystemAction systemAction)
    {
        return new RemindersSkill(systemAction, NullLogger<RemindersSkill>.Instance);
    }

    [TestMethod]
    public async Task CreateAsync_SingleItem_InvokesShortcutWithCorrectArgs()
    {
        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(new SystemActionResult(true, "done", null));

        var sut = MakeSut(systemAction);
        var items = new List<ActionItem> { new("Buy milk", "2026-05-01") };

        await sut.CreateAsync(items, CancellationToken.None);

        await systemAction.Received(1).InvokeAsync(
            "Mozgoslav: Add reminder",
            Arg.Is<IReadOnlyDictionary<string, string>>(d =>
                d["title"] == "Buy milk" && d["due"] == "2026-05-01"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task CreateAsync_MultipleItems_InvokesShortcutForEach()
    {
        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(new SystemActionResult(true, "done", null));

        var sut = MakeSut(systemAction);
        var items = new List<ActionItem>
        {
            new("Task A", null),
            new("Task B", "2026-06-01")
        };

        await sut.CreateAsync(items, CancellationToken.None);

        await systemAction.Received(2).InvokeAsync(
            "Mozgoslav: Add reminder",
            Arg.Any<IReadOnlyDictionary<string, string>>(),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task CreateAsync_EmptyList_DoesNotInvokeShortcut()
    {
        var systemAction = Substitute.For<ISystemAction>();
        var sut = MakeSut(systemAction);

        await sut.CreateAsync([], CancellationToken.None);

        await systemAction.DidNotReceiveWithAnyArgs()
            .InvokeAsync(default!, default!, default);
    }

    [TestMethod]
    public async Task CreateAsync_ItemWithBlankTitle_Skips()
    {
        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(new SystemActionResult(true, "done", null));

        var sut = MakeSut(systemAction);
        var items = new List<ActionItem>
        {
            new("   ", null),
            new("Valid task", null)
        };

        await sut.CreateAsync(items, CancellationToken.None);

        await systemAction.Received(1).InvokeAsync(
            Arg.Any<string>(),
            Arg.Is<IReadOnlyDictionary<string, string>>(d => d["title"] == "Valid task"),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task CreateAsync_NullItems_ThrowsArgumentNullException()
    {
        var sut = MakeSut(Substitute.For<ISystemAction>());

        var act = async () => await sut.CreateAsync(null!, CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentNullException>();
    }

    [TestMethod]
    public async Task CreateAsync_ShortcutFails_DoesNotPropagateException()
    {
        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns<SystemActionResult>(_ => throw new InvalidOperationException("shortcut unavailable"));

        var sut = MakeSut(systemAction);

        var act = async () => await sut.CreateAsync([new ActionItem("Task", null)], CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task CreateAsync_DueIsNull_SendsEmptyStringForDueArg()
    {
        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns(new SystemActionResult(true, null, null));

        var sut = MakeSut(systemAction);
        await sut.CreateAsync([new ActionItem("No deadline", null)], CancellationToken.None);

        await systemAction.Received(1).InvokeAsync(
            Arg.Any<string>(),
            Arg.Is<IReadOnlyDictionary<string, string>>(d => d["due"] == string.Empty),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task CreateAsync_CancellationRequested_PropagatesCancellation()
    {
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var systemAction = Substitute.For<ISystemAction>();
        systemAction.InvokeAsync(Arg.Any<string>(), Arg.Any<IReadOnlyDictionary<string, string>>(), Arg.Any<CancellationToken>())
            .Returns<SystemActionResult>(_ => throw new OperationCanceledException(cts.Token));

        var sut = MakeSut(systemAction);

        var act = async () => await sut.CreateAsync([new ActionItem("Task", null)], cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }
}
