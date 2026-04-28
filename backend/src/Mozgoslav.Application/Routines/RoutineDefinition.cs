using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Routines;

public sealed record RoutineDefinition(
    string Key,
    string DisplayName,
    string Description,
    bool IsEnabled,
    RoutineRun? LastRun);
