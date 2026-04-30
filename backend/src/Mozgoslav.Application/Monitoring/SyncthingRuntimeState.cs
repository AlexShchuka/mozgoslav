namespace Mozgoslav.Application.Monitoring;

public sealed record SyncthingRuntimeState(
    string Detection,
    string? BinaryPath,
    string? ApiUrl,
    string? Version,
    string? Hint);
