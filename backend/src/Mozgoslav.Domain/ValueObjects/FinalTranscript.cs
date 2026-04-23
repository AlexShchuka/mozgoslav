using System;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record FinalTranscript(string RawText, string PolishedText, TimeSpan Duration);
