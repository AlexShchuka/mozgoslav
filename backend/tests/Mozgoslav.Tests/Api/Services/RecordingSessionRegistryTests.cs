using System;
using System.Collections.Generic;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Api.Services;

namespace Mozgoslav.Tests.Api.Services;

[TestClass]
public sealed class RecordingSessionRegistryTests
{
    [TestMethod]
    public void TryStart_WhenNoSession_ReturnsTrueAndSession()
    {
        var registry = new RecordingSessionRegistry();
        var recordingId = Guid.NewGuid();
        var dictationId = Guid.NewGuid();

        var started = registry.TryStart(recordingId, dictationId, "/tmp/out.wav", out var session);

        started.Should().BeTrue();
        session.Should().NotBeNull();
        session.RecordingId.Should().Be(recordingId);
        session.DictationSessionId.Should().Be(dictationId);
        session.OutputPath.Should().Be("/tmp/out.wav");
        session.SessionId.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public void TryStart_WhenSessionAlreadyActive_ReturnsFalse()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out1.wav", out _);

        var started = registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out2.wav", out var returned);

        started.Should().BeFalse();
        returned.Should().Be(registry.Current);
    }

    [TestMethod]
    public void TryStop_ExistingSession_ReturnsTrueAndClearsSession()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out.wav", out var started);

        var stopped = registry.TryStop(started.SessionId, out var returned);

        stopped.Should().BeTrue();
        returned.Should().Be(started);
        registry.Current.Should().BeNull();
    }

    [TestMethod]
    public void TryStop_WrongSessionId_ReturnsFalse()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out.wav", out _);

        var stopped = registry.TryStop("nonexistent-session-id", out var returned);

        stopped.Should().BeFalse();
        returned.Should().BeNull();
        registry.Current.Should().NotBeNull();
    }

    [TestMethod]
    public void TryStop_NoActiveSession_ReturnsFalse()
    {
        var registry = new RecordingSessionRegistry();

        var stopped = registry.TryStop("any-id", out var returned);

        stopped.Should().BeFalse();
        returned.Should().BeNull();
    }

    [TestMethod]
    public void Current_InitiallyNull()
    {
        var registry = new RecordingSessionRegistry();

        registry.Current.Should().BeNull();
    }

    [TestMethod]
    public void Current_AfterStart_ReturnsSession()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out.wav", out var started);

        registry.Current.Should().Be(started);
    }

    [TestMethod]
    public void Current_AfterStop_IsNull()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out.wav", out var started);
        registry.TryStop(started.SessionId, out _);

        registry.Current.Should().BeNull();
    }

    [TestMethod]
    public void TryStart_AfterStop_AllowsNewSession()
    {
        var registry = new RecordingSessionRegistry();
        registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out1.wav", out var first);
        registry.TryStop(first.SessionId, out _);

        var second = registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/out2.wav", out var secondSession);

        second.Should().BeTrue();
        secondSession.OutputPath.Should().Be("/out2.wav");
    }

    [TestMethod]
    public async Task TryStart_ConcurrentCalls_OnlyOneSucceeds()
    {
        var registry = new RecordingSessionRegistry();
        const int threadCount = 50;
        var results = new List<bool>(threadCount);
        var lockObj = new object();

        var tasks = new List<Task>(threadCount);
        for (var i = 0; i < threadCount; i++)
        {
            tasks.Add(Task.Run(() =>
            {
                var started = registry.TryStart(Guid.NewGuid(), Guid.NewGuid(), "/path.wav", out _);
                lock (lockObj)
                {
                    results.Add(started);
                }
            }));
        }
        await Task.WhenAll(tasks);

        results.Should().ContainSingle(r => r);
    }
}
