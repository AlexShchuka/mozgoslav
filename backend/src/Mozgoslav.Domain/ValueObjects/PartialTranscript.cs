using System;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record PartialTranscript(string Text, TimeSpan Timestamp);
