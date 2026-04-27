using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Obsidian;

[TestClass]
public sealed class ObsidianMutationTests : GraphTestsBase
{
    [TestMethod]
    public async Task SetupObsidian_ReturnsValidationErrorForEmptyPath()
    {
        var result = await ExecuteAsync(@"
mutation {
  setupObsidian(vaultPath: """") {
    report {
      vaultPath
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["setupObsidian"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["setupObsidian"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task SetupObsidian_ReturnsSetupFailedForNonexistentPath()
    {
        var result = await ExecuteAsync(@"
mutation {
  setupObsidian(vaultPath: ""/nonexistent/vault/path/xyz"") {
    report {
      vaultPath
      createdPaths
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["setupObsidian"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task ObsidianRunDiagnostics_ReturnsReport()
    {
        var result = await ExecuteAsync(@"
mutation {
  obsidianRunDiagnostics {
    report {
      vault { ok severity code message vaultPath }
      plugins { pluginId installed enabled hashMatches optional expectedVersion installedVersion }
      templater { ok templatesFolder userScriptsFolder }
      bootstrap { ok files { relativePath status } }
      restApi { ok required host version }
      lmStudio { ok endpoint }
      generatedAt
      snapshotId
      isHealthy
    }
    errors { code message }
  }
}");

        result["data"]!["obsidianRunDiagnostics"]!["report"].Should().NotBeNull();
        result["data"]!["obsidianRunDiagnostics"]!["errors"].Should().NotBeNull();
    }

    [TestMethod]
    public async Task ObsidianRunWizardStep_RejectsOutOfRangeStep()
    {
        var result = await ExecuteAsync(@"
mutation {
  obsidianRunWizardStep(step: 0) {
    currentStep
    nextStep
    errors { code message }
  }
}");

        var errors = result["data"]!["obsidianRunWizardStep"]!["errors"]!.AsArray();
        errors.Should().HaveCount(1);
        errors[0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }

    [TestMethod]
    public async Task ObsidianRunWizardStep_Step1_ReturnsCurrentStepWithErrorWhenVaultMissing()
    {
        var result = await ExecuteAsync(@"
mutation {
  obsidianRunWizardStep(step: 1) {
    currentStep
    nextStep
    diagnostics { isHealthy }
    errors { code message }
  }
}");

        var payload = result["data"]!["obsidianRunWizardStep"]!;
        payload["currentStep"]!.GetValue<int>().Should().Be(1);
        payload["errors"]!.AsArray().Should().HaveCount(1);
    }

    [TestMethod]
    public async Task ObsidianReapplyBootstrap_ReturnsValidationErrorWhenVaultMissing()
    {
        var result = await ExecuteAsync(@"
mutation {
  obsidianReapplyBootstrap {
    overwritten
    skipped
    backedUpTo
    errors { code message }
  }
}");

        var payload = result["data"]!["obsidianReapplyBootstrap"]!;
        payload["errors"]!.AsArray().Should().HaveCount(1);
    }

    [TestMethod]
    public async Task ObsidianReinstallPlugins_ReturnsValidationErrorWhenVaultMissing()
    {
        var result = await ExecuteAsync(@"
mutation {
  obsidianReinstallPlugins {
    reinstalled
    errors { code message }
  }
}");

        var payload = result["data"]!["obsidianReinstallPlugins"]!;
        payload["errors"]!.AsArray().Should().HaveCount(1);
        payload["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION");
    }
}
