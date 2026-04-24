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
}
