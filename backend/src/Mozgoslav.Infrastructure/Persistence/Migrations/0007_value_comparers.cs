namespace Mozgoslav.Infrastructure.Persistence.Migrations;

/// <summary>
/// Migration marker #0007 — ADR-007 / BC-051 / bug 7.
/// <para>
/// This project bootstraps its SQLite schema via
/// <see cref="Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade.EnsureCreated"/>
/// (see <c>DatabaseInitializer</c>) — there is no
/// <c>Microsoft.EntityFrameworkCore.Tools</c> nor a
/// <c>__EFMigrationsHistory</c> table yet. Introducing classic EF Core
/// migration tooling is a separate, larger piece of work (see Phase 2 Open
/// Items) and therefore out of scope for Phase 1 Agent A.
/// </para>
/// <para>
/// The 0007 change is logically annotation-only: every mutable
/// reference-typed collection property on <c>ProcessedNote</c>,
/// <c>Profile</c> and <c>Transcript</c> received an explicit
/// <see cref="Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer"/>
/// so the EF change tracker sees in-place edits. There is no DDL to roll
/// forward or back — the schema is unchanged — so this file is a pure
/// audit marker that records WHAT landed and WHEN inside
/// <c>MozgoslavDbContext.OnModelCreating</c>.
/// </para>
/// <para>
/// When Phase 2 Backend adopts the EF migrations tool, this marker will be
/// removed in favour of a generated <c>0007_value_comparers.Designer.cs</c>
/// + <c>0007_value_comparers.cs</c> pair. Until then, this file stays here
/// so the ADR-007 / 2.8 migration ledger remains accurate.
/// </para>
/// </summary>
internal static class Migration0007ValueComparers
{
    public const string Id = "0007_value_comparers";
}
