using System.IO;
using System.Threading.Tasks;

namespace Mozgoslav.Tests.Graph;

[TestClass]
public sealed class SdlPrintTest
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public async Task PrintSdl()
    {
        await using var factory = new GraphApiFactory();
        var sdl = await SchemaExportHelper.ExportSdlAsync(factory);
        await File.WriteAllTextAsync("/tmp/schema-current.graphql", sdl);
        TestContext.WriteLine(sdl);
    }
}
