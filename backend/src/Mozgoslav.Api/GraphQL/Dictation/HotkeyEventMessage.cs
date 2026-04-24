using System;

namespace Mozgoslav.Api.GraphQL.Dictation;

public sealed record HotkeyEventMessage(
    string Kind,
    string Accelerator,
    DateTime ObservedAt);
