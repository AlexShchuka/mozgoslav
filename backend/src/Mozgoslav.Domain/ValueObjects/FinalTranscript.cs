namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// Final dictation transcript, produced after the user releases the hotkey.
/// <see cref="PolishedText"/> is populated when LLM polish is enabled and the
/// endpoint is reachable; otherwise it mirrors <see cref="RawText"/>.
/// </summary>
public sealed record FinalTranscript(string RawText, string PolishedText, TimeSpan Duration);
