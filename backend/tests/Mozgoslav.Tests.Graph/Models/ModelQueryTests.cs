using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Models;

[TestClass]
public sealed class ModelQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Models_ReturnsNonEmptyList()
    {
        var result = await ExecuteAsync(@"
{
  models {
    id
    name
    sizeMb
    kind
    tier
    isDefault
    destinationPath
    installed
  }
}");

        result["data"]!["models"].Should().NotBeNull();
        result["data"]!["models"]!.AsArray().Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task DownloadModel_ReturnsValidationErrorForEmptyCatalogueId()
    {
        var result = await ExecuteAsync(@"
mutation {
  downloadModel(catalogueId: """") {
    downloadId
    errors {
      code
      message
    }
  }
}");

        result["data"]!["downloadModel"]!["downloadId"].Should().BeNull();
        result["data"]!["downloadModel"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["downloadModel"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task DownloadModel_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  downloadModel(catalogueId: ""nonexistent-model"") {
    downloadId
    errors {
      code
      message
    }
  }
}");

        result["data"]!["downloadModel"]!["downloadId"].Should().BeNull();
        result["data"]!["downloadModel"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["downloadModel"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
