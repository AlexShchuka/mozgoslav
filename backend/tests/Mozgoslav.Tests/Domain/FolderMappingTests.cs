using System;

using FluentAssertions;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public sealed class FolderMappingTests
{
    [TestMethod]
    public void FolderMapping_Create_StoresAliasAndVaultPathAndCategory()
    {
        var id = Guid.NewGuid();
        var mapping = new FolderMapping(id, "inbox", "/vault/_inbox", ParaCategory.Resource);

        mapping.Id.Should().Be(id);
        mapping.Alias.Should().Be("inbox");
        mapping.VaultPath.Should().Be("/vault/_inbox");
        mapping.Category.Should().Be(ParaCategory.Resource);
    }

    [TestMethod]
    public void ParaCategory_CoversAllFourBuckets()
    {
        var values = Enum.GetValues<ParaCategory>();
        values.Should().Contain(
        [
            ParaCategory.Project,
            ParaCategory.Area,
            ParaCategory.Resource,
            ParaCategory.Archive
        ]);
    }

    [TestMethod]
    public void VaultExportRule_Create_StoresProfileAndTargetAliasAndAutoApply()
    {
        var id = Guid.NewGuid();
        var rule = new VaultExportRule(id, "work-profile", "projects", AutoApplyOnExport: true);

        rule.Id.Should().Be(id);
        rule.SourceProfileId.Should().Be("work-profile");
        rule.TargetFolderAlias.Should().Be("projects");
        rule.AutoApplyOnExport.Should().BeTrue();
    }
}
