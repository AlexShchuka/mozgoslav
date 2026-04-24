using System.Threading.Tasks;

using FluentAssertions;

namespace Mozgoslav.Tests.Graph.Profiles;

[TestClass]
public sealed class ProfileQueryTests : GraphTestsBase
{
    [TestMethod]
    public async Task Profiles_ReturnsBuiltInProfiles()
    {
        var result = await ExecuteAsync(@"
{
  profiles {
    id
    name
    isBuiltIn
    isDefault
    cleanupLevel
  }
}");

        result["data"]!["profiles"].Should().NotBeNull();
        result["data"]!["profiles"]!.AsArray().Should().NotBeEmpty();
    }

    [TestMethod]
    public async Task Profile_ReturnsNullForUnknownId()
    {
        var result = await ExecuteAsync(@"
{
  profile(id: ""00000000-0000-0000-0000-000000000000"") {
    id
    name
  }
}");

        result["data"]!.AsObject().ContainsKey("profile").Should().BeTrue();
        result["data"]!["profile"].Should().BeNull();
    }

    [TestMethod]
    public async Task CreateProfile_ReturnsCreatedProfile()
    {
        var result = await ExecuteAsync(@"
mutation {
  createProfile(input: {
    name: ""Test Profile""
    systemPrompt: ""You are a helpful assistant""
    outputTemplate: """"
    cleanupLevel: LIGHT
    exportFolder: ""_inbox""
    autoTags: []
    glossary: []
    llmCorrectionEnabled: false
    isDefault: false
  }) {
    profile {
      id
      name
      isBuiltIn
      cleanupLevel
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["createProfile"]!["profile"]!["name"]!.GetValue<string>().Should().Be("Test Profile");
        result["data"]!["createProfile"]!["profile"]!["isBuiltIn"]!.GetValue<bool>().Should().BeFalse();
        result["data"]!["createProfile"]!["errors"]!.AsArray().Should().BeEmpty();
    }

    [TestMethod]
    public async Task CreateProfile_ReturnsValidationErrorForEmptyName()
    {
        var result = await ExecuteAsync(@"
mutation {
  createProfile(input: {
    name: """"
    systemPrompt: """"
    outputTemplate: """"
    cleanupLevel: NONE
    exportFolder: ""_inbox""
    autoTags: []
    glossary: []
    llmCorrectionEnabled: false
    isDefault: false
  }) {
    profile {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["createProfile"]!.AsObject().ContainsKey("profile").Should().BeTrue();
        result["data"]!["createProfile"]!["profile"].Should().BeNull();
        result["data"]!["createProfile"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["createProfile"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("VALIDATION_ERROR");
    }

    [TestMethod]
    public async Task DeleteProfile_ReturnsNotFoundForUnknownId()
    {
        var result = await ExecuteAsync(@"
mutation {
  deleteProfile(id: ""00000000-0000-0000-0000-000000000001"") {
    profile {
      id
    }
    errors {
      code
      message
    }
  }
}");

        result["data"]!["deleteProfile"]!["errors"]!.AsArray().Should().HaveCount(1);
        result["data"]!["deleteProfile"]!["errors"]![0]!["code"]!.GetValue<string>().Should().Be("NOT_FOUND");
    }
}
