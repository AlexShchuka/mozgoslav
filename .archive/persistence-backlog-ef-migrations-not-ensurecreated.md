---
id: persistence-ef-migrations-not-ensurecreated
status: proposed
audience: agent
---

# persistence-ef-migrations-not-ensurecreated

## context
Backend uses `EnsureCreatedAsync` for SQLite schema. Documented in CLAUDE.md as «drop the db on schema changes in dev». Works for one developer iterating one branch at a time.

## problem
- Autonomous agents on parallel feature branches each touch domain entities → next checkout = `EnsureCreated` mismatch → silent data loss or runtime error.
- No upgrade path between schema versions: a user installing a new release loses local notes, recordings, settings.
- Current decision is not labelled «only viable while no installed users exist». As distribution comes online, the policy is a footgun.

## proposal
- Add EF Core Migrations targeting SQLite. Replace `EnsureCreatedAsync` with `MigrateAsync` at startup.
- Policy: every PR that mutates a domain entity adds the corresponding migration in the same commit.
- CI guard: `dotnet ef migrations has-pending-model-changes` returns non-zero → build fails.
- Local dev keeps a `--reset-db` CLI flag for explicit destructive resets when iterating on schema drafts.
- Initial migration captures the current schema as baseline.

## acceptance
- [ ] `Mozgoslav.Infrastructure` has a Migrations folder with one initial migration generated from current schema.
- [ ] `Program.cs` calls `MigrateAsync` on startup.
- [ ] CI «pending model changes» guard wired and red on a deliberate violation.
- [ ] CLAUDE.md updated to remove the «drop the db» policy.
- [ ] `--reset-db` flag exists and is documented in `backend/CLAUDE.md`.

## rejected
| alt | reason |
|---|---|
| Stay on `EnsureCreatedAsync` | breaks for installed users + concurrent branches. |
| Custom hand-rolled migrator | reinvents EF Core Migrations; more code, fewer features. |
| FluentMigrator | another framework to learn; EF Core's tooling is already in the stack. |
