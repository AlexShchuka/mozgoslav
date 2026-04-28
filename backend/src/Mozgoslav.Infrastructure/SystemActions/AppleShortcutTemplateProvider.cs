using System.Collections.Generic;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.SystemActions;

public sealed class AppleShortcutTemplateProvider : ISystemActionTemplateProvider
{
    private static readonly IReadOnlyList<SystemActionTemplate> Templates =
    [
        new SystemActionTemplate(
            Name: "Mozgoslav: Add reminder",
            Description: "Creates a reminder in Reminders.app from voice input",
            DeeplinkUrl: "shortcuts://import-shortcut?url=mozgoslav://shortcuts/MozgoslavAddReminder.shortcut&name=Mozgoslav%3A%20Add%20reminder"),

        new SystemActionTemplate(
            Name: "Mozgoslav: Add calendar event",
            Description: "Creates a calendar event in Calendar.app from voice input",
            DeeplinkUrl: "shortcuts://import-shortcut?url=mozgoslav://shortcuts/MozgoslavAddCalendarEvent.shortcut&name=Mozgoslav%3A%20Add%20calendar%20event"),

        new SystemActionTemplate(
            Name: "Mozgoslav: Open file",
            Description: "Opens a file by path using voice input",
            DeeplinkUrl: "shortcuts://import-shortcut?url=mozgoslav://shortcuts/MozgoslavOpenFile.shortcut&name=Mozgoslav%3A%20Open%20file"),
    ];

    public IReadOnlyList<SystemActionTemplate> GetTemplates()
    {
        return Templates;
    }
}
