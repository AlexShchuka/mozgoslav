using System;
using System.IO;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Domain.Services;

namespace Mozgoslav.Tests.Domain;

[TestClass]
public sealed class HashCalculatorTests
{
    [TestMethod]
    public async Task Sha256Async_SameContent_ProducesSameHash()
    {
        var bytes = "mozgoslav test payload"u8.ToArray();
        using var streamA = new MemoryStream(bytes);
        using var streamB = new MemoryStream(bytes);

        var hashA = await HashCalculator.Sha256Async(streamA, TestContext.CancellationToken);
        var hashB = await HashCalculator.Sha256Async(streamB, TestContext.CancellationToken);

        hashA.Should().Be(hashB);
        hashA.Should().HaveLength(64);
        hashA.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [TestMethod]
    public async Task Sha256Async_DifferentContent_ProducesDifferentHash()
    {
        using var a = new MemoryStream("hello"u8.ToArray());
        using var b = new MemoryStream("world"u8.ToArray());

        var hashA = await HashCalculator.Sha256Async(a, TestContext.CancellationToken);
        var hashB = await HashCalculator.Sha256Async(b, TestContext.CancellationToken);

        hashA.Should().NotBe(hashB);
    }

    [TestMethod]
    public async Task Sha256Async_FromFile_MatchesStreamHash()
    {
        var path = Path.Combine(Path.GetTempPath(), $"mozgoslav-hash-{Guid.NewGuid():N}.bin");
        var payload = "Мысли вслух, встречи, диалоги, рассуждения."u8.ToArray();
        await File.WriteAllBytesAsync(path, payload, TestContext.CancellationToken);

        try
        {
            var fileHash = await HashCalculator.Sha256Async(path, TestContext.CancellationToken);

            using var stream = new MemoryStream(payload);
            var streamHash = await HashCalculator.Sha256Async(stream, TestContext.CancellationToken);

            fileHash.Should().Be(streamHash);
        }
        finally
        {
            File.Delete(path);
        }
    }

    public TestContext TestContext { get; set; }
}
