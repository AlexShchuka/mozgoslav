using System;
using System.Collections.Concurrent;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Tests.Integration;

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
