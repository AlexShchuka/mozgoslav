using System;
using System.Threading;

namespace Mozgoslav.Api.Services;

public sealed class RecordingSessionRegistry
{
    private readonly Lock _lock = new();
    private ActiveRecordingSession? _session;

    public bool TryStart(string outputPath, out ActiveRecordingSession session)
    {
        lock (_lock)
        {
            if (_session is not null)
            {
                session = _session;
                return false;
            }
            session = new ActiveRecordingSession(Guid.NewGuid().ToString("N"), outputPath, DateTime.UtcNow);
            _session = session;
            return true;
        }
    }

    public bool TryStop(string sessionId, out ActiveRecordingSession? session)
    {
        lock (_lock)
        {
            if (_session is null || !string.Equals(_session.SessionId, sessionId, StringComparison.Ordinal))
            {
                session = null;
                return false;
            }
            session = _session;
            _session = null;
            return true;
        }
    }

    public ActiveRecordingSession? Current
    {
        get
        {
            lock (_lock)
            {
                return _session;
            }
        }
    }
}

public sealed record ActiveRecordingSession(string SessionId, string OutputPath, DateTime StartedAtUtc);
