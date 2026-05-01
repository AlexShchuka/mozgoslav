using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Routines;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Routines;

using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Mozgoslav.Tests.Infrastructure.Routines;

[TestClass]
public sealed class RoutineRegistryTests
{
    private sealed class Fixture
    {
        public IAppSettings Settings { get; } = Substitute.For<IAppSettings>();
        public IRoutineRunRepository RunRepository { get; } = Substitute.For<IRoutineRunRepository>();
        public IActionExtractorSkill ActionExtractorSkill { get; } = Substitute.For<IActionExtractorSkill>();
        public IRemindersSkill RemindersSkill { get; } = Substitute.For<IRemindersSkill>();

        public Fixture()
        {
            RunRepository.AddAsync(Arg.Any<RoutineRun>(), Arg.Any<CancellationToken>())
                .Returns(ci => ci.Arg<RoutineRun>());
            RunRepository.UpdateAsync(Arg.Any<RoutineRun>(), Arg.Any<CancellationToken>())
                .Returns(Task.CompletedTask);
            RunRepository.TryGetLatestAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
                .Returns((RoutineRun?)null);
            Settings.Snapshot.Returns(AppSettingsDto.Defaults);
            Settings.SaveAsync(Arg.Any<AppSettingsDto>(), Arg.Any<CancellationToken>())
                .Returns(Task.CompletedTask);
        }

        public RoutineRegistry BuildSut() =>
            new(Settings, RunRepository, ActionExtractorSkill, RemindersSkill,
                NullLogger<RoutineRegistry>.Instance);
    }

    [TestMethod]
    public async Task ListAsync_ReturnsTwoRoutines()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var list = await sut.ListAsync(CancellationToken.None);

        list.Should().HaveCount(2);
        list.Should().Contain(r => r.Key == "action-extractor");
        list.Should().Contain(r => r.Key == "reminders");
    }

    [TestMethod]
    public async Task ListAsync_ReflectsSkillEnabledFromSettings()
    {
        var fixture = new Fixture();
        fixture.Settings.ActionsSkillEnabled.Returns(true);
        fixture.Settings.RemindersSkillEnabled.Returns(false);
        var sut = fixture.BuildSut();

        var list = await sut.ListAsync(CancellationToken.None);

        list.Should().Contain(r => r.Key == "action-extractor" && r.IsEnabled);
        list.Should().Contain(r => r.Key == "reminders" && !r.IsEnabled);
    }

    [TestMethod]
    public async Task RunNowAsync_ActionExtractorKey_SetsSucceeded()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var run = await sut.RunNowAsync("action-extractor", CancellationToken.None);

        run.Status.Should().Be("Succeeded");
        await fixture.RunRepository.Received(1).AddAsync(Arg.Any<RoutineRun>(), Arg.Any<CancellationToken>());
        await fixture.RunRepository.Received(1).UpdateAsync(Arg.Any<RoutineRun>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task RunNowAsync_RemindersKey_CallsRemindersSkillAndSucceeds()
    {
        var fixture = new Fixture();
        fixture.RemindersSkill.CreateAsync(Arg.Any<IReadOnlyList<ActionItem>>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask);
        var sut = fixture.BuildSut();

        var run = await sut.RunNowAsync("reminders", CancellationToken.None);

        run.Status.Should().Be("Succeeded");
        await fixture.RemindersSkill.Received(1)
            .CreateAsync(Arg.Any<IReadOnlyList<ActionItem>>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task RunNowAsync_UnknownKey_SetsFailed()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var run = await sut.RunNowAsync("unknown-key", CancellationToken.None);

        run.Status.Should().Be("Failed");
        run.ErrorMessage.Should().Contain("Unknown routine key");
    }

    [TestMethod]
    public async Task RunNowAsync_EmptyKey_ThrowsArgumentException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.RunNowAsync("", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task RunNowAsync_SkillThrows_StatusIsFailed()
    {
        var fixture = new Fixture();
        fixture.RemindersSkill.CreateAsync(Arg.Any<IReadOnlyList<ActionItem>>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("skill broke"));
        var sut = fixture.BuildSut();

        var run = await sut.RunNowAsync("reminders", CancellationToken.None);

        run.Status.Should().Be("Failed");
        run.ErrorMessage.Should().Contain("skill broke");
    }

    [TestMethod]
    public async Task ToggleAsync_ActionExtractorKey_SavesActionsSkillEnabled()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        await sut.ToggleAsync("action-extractor", enabled: true, CancellationToken.None);

        await fixture.Settings.Received(1).SaveAsync(
            Arg.Is<AppSettingsDto>(d => d.ActionsSkillEnabled),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ToggleAsync_RemindersKey_SavesRemindersSkillEnabled()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        await sut.ToggleAsync("reminders", enabled: false, CancellationToken.None);

        await fixture.Settings.Received(1).SaveAsync(
            Arg.Is<AppSettingsDto>(d => !d.RemindersSkillEnabled),
            Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task ToggleAsync_UnknownKey_ThrowsInvalidOperationException()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var act = async () => await sut.ToggleAsync("bad-key", true, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
