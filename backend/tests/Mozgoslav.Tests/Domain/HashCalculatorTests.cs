using System.Text;
using FluentAssertions;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public class HashCalculatorTests
{
    [TestMethod]
    public async Task Sha256Async_SameContent_ProducesSameHash()
    {
        var bytes = Encoding.UTF8.GetBytes("mozgoslav test payload");
        using var streamA = new MemoryStream(bytes);
        using var streamB = new MemoryStream(bytes);

        var hashA = await HashCalculator.Sha256Async(streamA);
        var hashB = await HashCalculator.Sha256Async(streamB);

        hashA.Should().Be(hashB);
        hashA.Should().HaveLength(64);
        hashA.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [TestMethod]
    public async Task Sha256Async_DifferentContent_ProducesDifferentHash()
    {
        using var a = new MemoryStream(Encoding.UTF8.GetBytes("hello"));
        using var b = new MemoryStream(Encoding.UTF8.GetBytes("world"));

        var hashA = await HashCalculator.Sha256Async(a);
        var hashB = await HashCalculator.Sha256Async(b);

        hashA.Should().NotBe(hashB);
    }

    [TestMethod]
    public async Task Sha256Async_FromFile_MatchesStreamHash()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-hash-{Guid.NewGuid():N}.bin");
        var payload = Encoding.UTF8.GetBytes("Мысли вслух, встречи, диалоги, рассуждения.");
        await File.WriteAllBytesAsync(path, payload);

        try
        {
            var fileHash = await HashCalculator.Sha256Async(path);

            using var stream = new MemoryStream(payload);
            var streamHash = await HashCalculator.Sha256Async(stream);

            fileHash.Should().Be(streamHash);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
