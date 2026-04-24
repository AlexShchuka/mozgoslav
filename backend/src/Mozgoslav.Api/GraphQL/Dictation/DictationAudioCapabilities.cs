namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record DictationAudioCapabilities(
    bool IsSupported,
    string DetectedPlatform,
    string[] PermissionsRequired);
