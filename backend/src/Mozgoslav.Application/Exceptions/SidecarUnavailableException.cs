using System;

namespace Mozgoslav.Application.Exceptions;

public sealed class SidecarUnavailableException : Exception
{
    public string Sidecar { get; }

    public SidecarUnavailableException(string sidecar, Exception inner)
        : base($"Required sidecar '{sidecar}' is unavailable.", inner)
    {
        Sidecar = sidecar;
    }
}
