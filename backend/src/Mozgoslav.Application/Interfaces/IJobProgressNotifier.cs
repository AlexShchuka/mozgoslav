using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IJobProgressNotifier
{
    ValueTask PublishAsync(ProcessingJob job, CancellationToken ct);
    IAsyncEnumerable<ProcessingJob> SubscribeAsync(CancellationToken ct);
}
