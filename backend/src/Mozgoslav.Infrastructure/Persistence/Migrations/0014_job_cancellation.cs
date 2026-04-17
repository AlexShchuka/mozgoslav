namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0014 — ADR-015 job cancellation.
/// <para>
/// Adds the <c>cancel_requested</c> column to the <c>processing_jobs</c> table:
/// </para>
/// <code>
///   ALTER TABLE processing_jobs
///       ADD COLUMN cancel_requested INTEGER NOT NULL DEFAULT 0;
/// </code>
/// <para>
/// The column is materialised automatically by EF Core's
/// <see cref="Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade.EnsureCreatedAsync"/>
/// on a fresh database (see <see cref="Mozgoslav.Infrastructure.Seed.DatabaseInitializer"/>)
/// because the property is mapped on <c>ProcessingJob</c> with a
/// <c>HasDefaultValue(false)</c> clause in <c>MozgoslavDbContext.OnModelCreating</c>.
/// On existing developer databases the column can be added manually with the
/// ALTER statement above; <c>EnsureCreatedAsync</c> is a no-op once the table
/// is present, so we keep the ledger slot here and rely on manual DDL for the
/// pre-existing rows (aligned with the policy in
/// <see cref="Migration0008RagEmbeddings"/>).
/// </para>
/// <para>
/// Also pins the <see cref="Mozgoslav.Domain.Enums.JobStatus.Cancelled"/>
/// enum value as a terminal state. The EF converter stores it as a string, so
/// adding the value at the end of the enum does not require any data
/// migration for historical rows.
/// </para>
/// </summary>
internal static class Migration0014JobCancellation
{
    public const string Id = "0014_job_cancellation";

    public const string CancelRequestedColumn = "cancel_requested";
}
