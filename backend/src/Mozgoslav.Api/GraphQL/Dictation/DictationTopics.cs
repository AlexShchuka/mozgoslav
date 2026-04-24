namespace Mozgoslav.Api.GraphQL.Dictation;

public static class DictationTopics
{
    public static string ForSession(System.Guid sessionId) => $"DictationEvents:{sessionId}";
    public const string AudioDeviceChanged = "AudioDeviceChanged";
    public const string HotkeyEvents = "HotkeyEvents";
}
