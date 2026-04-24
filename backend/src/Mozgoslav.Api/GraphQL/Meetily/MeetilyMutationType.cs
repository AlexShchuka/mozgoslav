using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Api.GraphQL.Meetily;

[ExtendObjectType(typeof(MutationType))]
public sealed class MeetilyMutationType
{
    public async Task<MeetilyImportPayload> ImportFromMeetily(
        string meetilyDatabasePath,
        [Service] MeetilyImporterService importer,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(meetilyDatabasePath))
        {
            return new MeetilyImportPayload(null, null, null, null, [new ValidationError("VALIDATION", "meetilyDatabasePath is required", "meetilyDatabasePath")]);
        }
        try
        {
            var report = await importer.ImportAsync(meetilyDatabasePath, ct);
            return new MeetilyImportPayload(report.TotalMeetings, report.ImportedRecordings, report.SkippedDuplicates, report.Errors, []);
        }
        catch (FileNotFoundException ex)
        {
            return new MeetilyImportPayload(null, null, null, null, [new NotFoundError("NOT_FOUND", ex.Message, "MeetilyDatabase", meetilyDatabasePath)]);
        }
        catch (InvalidOperationException ex)
        {
            return new MeetilyImportPayload(null, null, null, null, [new ValidationError("VALIDATION", ex.Message, "meetilyDatabasePath")]);
        }
        catch (ArgumentException ex)
        {
            return new MeetilyImportPayload(null, null, null, null, [new ValidationError("VALIDATION", ex.Message, "meetilyDatabasePath")]);
        }

    }
}
