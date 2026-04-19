using System;
using System.Collections.Concurrent;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// Records every rendered log message for one logger category. Used by
/// <c>StartupLogTests</c> to assert "SQLite schema ensured" and "Seeded 3
/// built-in profiles" are each emitted exactly once per host start-up
/// (ADR-007 BC-052, bug 8).
/// </summary>
internal sealed class CapturingLogger<T> : ILogger<T>
{
    private readonly ConcurrentQueue<string> _messages;

    public CapturingLogger(ConcurrentQueue<string> messages)
    {
        _messages = messages;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        ArgumentNullException.ThrowIfNull(formatter);
        _messages.Enqueue(formatter(state, exception));
    }
}
