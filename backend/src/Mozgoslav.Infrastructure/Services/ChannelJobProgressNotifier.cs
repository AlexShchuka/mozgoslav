using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// In-process fan-out notifier: each SSE subscriber gets its own unbounded channel,
/// and every publish writes to all current subscribers. Unsubscribing closes the
/// subscriber's channel so enumerators complete cleanly.
/// </summary>
public sealed class ChannelJobProgressNotifier : IJobProgressNotifier, IDisposable
{
    private readonly ConcurrentDictionary<Guid, Channel<ProcessingJob>> _subscribers = new();

    public async ValueTask PublishAsync(ProcessingJob job, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(job);

        // Snapshot a shallow clone so concurrent mutations in the worker don't
        // leak unexpected state through the SSE stream.
        var snapshot = Clone(job);

        foreach (var channel in _subscribers.Values)
        {
            await channel.Writer.WriteAsync(snapshot, ct);
        }
    }

    public async IAsyncEnumerable<ProcessingJob> SubscribeAsync(
        [EnumeratorCancellation] CancellationToken ct)
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<ProcessingJob>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

        _subscribers[id] = channel;
        try
        {
            await foreach (var job in channel.Reader.ReadAllAsync(ct))
            {
                yield return job;
            }
        }
        finally
        {
            _subscribers.TryRemove(id, out _);
            channel.Writer.TryComplete();
        }
    }

    public void Dispose()
    {
        foreach (var channel in _subscribers.Values)
        {
            channel.Writer.TryComplete();
        }
        _subscribers.Clear();
    }

    private static ProcessingJob Clone(ProcessingJob src) => new()
    {
        Id = src.Id,
        RecordingId = src.RecordingId,
        ProfileId = src.ProfileId,
        Status = src.Status,
        Progress = src.Progress,
        CurrentStep = src.CurrentStep,
        ErrorMessage = src.ErrorMessage,
        CreatedAt = src.CreatedAt,
        StartedAt = src.StartedAt,
        FinishedAt = src.FinishedAt
    };
}
