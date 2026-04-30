namespace Mozgoslav.Application.Monitoring;

public sealed record SupervisorServiceState(
    string Name,
    string State,
    string? LastError,
    int RestartCount,
    int? Pid,
    int? Port);
