using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Dictation;

[ExtendObjectType(typeof(QueryType))]
public sealed class DictationQueryType
{
    public DictationAudioCapabilities DictationAudioCapabilities()
    {
        var isSupported = RuntimeInformation.IsOSPlatform(OSPlatform.OSX);
        return new DictationAudioCapabilities(
            IsSupported: isSupported,
            DetectedPlatform: RuntimeInformation.RuntimeIdentifier,
            PermissionsRequired: isSupported ? ["microphone"] : []);
    }

    public Task<DictationSessionStatus?> DictationStatus(
        Guid sessionId,
        [Service] IDictationSessionManager manager)
    {
        var session = manager.TryGet(sessionId);
        if (session is null)
        {
            return Task.FromResult<DictationSessionStatus?>(null);
        }
        return Task.FromResult<DictationSessionStatus?>(new DictationSessionStatus(
            session.Id,
            session.State.ToString(),
            session.Source,
            session.StartedAt));
    }
}
