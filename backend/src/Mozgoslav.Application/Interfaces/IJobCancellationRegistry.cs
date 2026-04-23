using System;
using System.Threading;

namespace Mozgoslav.Application.Interfaces;

public interface IJobCancellationRegistry
{
    CancellationTokenSource Register(Guid jobId, CancellationToken hostToken);

    void Unregister(Guid jobId);

    bool TryCancel(Guid jobId);
}
