using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Publishes <see cref="ProcessingJob"/> state changes so the API can stream them
/// to the frontend via Server-Sent Events. Implementations fan-out to any number
/// of concurrent subscribers.
/// </summary>
public interface IJobProgressNotifier
{
    ValueTask PublishAsync(ProcessingJob job, CancellationToken ct);
    IAsyncEnumerable<ProcessingJob> SubscribeAsync(CancellationToken ct);
}
