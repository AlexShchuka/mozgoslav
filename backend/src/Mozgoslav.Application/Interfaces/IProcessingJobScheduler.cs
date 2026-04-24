using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessingJobScheduler
{
    Task ScheduleAsync(Guid jobId, CancellationToken ct);
}
