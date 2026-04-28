namespace Mozgoslav.Application.Interfaces;

public sealed record SystemActionResult(
    bool Success,
    string? Output,
    string? Error);
