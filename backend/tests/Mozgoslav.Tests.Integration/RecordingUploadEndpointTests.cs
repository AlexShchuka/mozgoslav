using System.Net;
using System.Net.Http.Headers;

using FluentAssertions;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// U1 — onboarding try-it-now button uploads a bundled sample WAV via the
/// standard multipart path. The endpoint has to accept a minimal WAV body
/// and produce a non-empty Recording list that the onboarding flow can
/// forward into the queue.
/// </summary>
[TestClass]
public sealed class RecordingUploadEndpointTests
{
    [TestMethod]
    public async Task PostUpload_WithTinyWavFile_Returns200AndRecordings()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();

        var wavBytes = BuildSilentWav(durationSeconds: 1);
        using var form = new MultipartFormDataContent();
        using var fileContent = new ByteArrayContent(wavBytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("audio/wav");
        form.Add(fileContent, "files", "u1-sample.wav");

        using var response = await client.PostAsync(
            "/api/recordings/upload", form, TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync(TestContext.CancellationToken);
        body.Should().NotBeNullOrWhiteSpace();
        // The response shape is Recording[]; we assert minimally that the array
        // is non-empty so U1's follow-up navigation (→ /queue) has a target.
        body.Should().Contain("\"id\":",
            "uploading a valid WAV creates at least one Recording entity");
    }

    public TestContext TestContext { get; set; } = null!;

    /// <summary>
    /// Builds a minimal but decoder-valid PCM WAV in memory. 16 kHz mono
    /// 16-bit little-endian silence; enough metadata for WhisperNet to
    /// accept the file shape even though the test does not run Whisper.
    /// </summary>
    private static byte[] BuildSilentWav(int durationSeconds)
    {
        const int sampleRate = 16_000;
        const int channels = 1;
        const int bitsPerSample = 16;
        var totalSamples = sampleRate * durationSeconds;
        var dataSize = totalSamples * channels * (bitsPerSample / 8);
        var fileSize = 36 + dataSize;

        using var stream = new MemoryStream();
        using var writer = new BinaryWriter(stream);
        writer.Write("RIFF"u8.ToArray());
        writer.Write(fileSize);
        writer.Write("WAVE"u8.ToArray());
        writer.Write("fmt "u8.ToArray());
        writer.Write(16); // fmt chunk size
        writer.Write((short)1); // PCM
        writer.Write((short)channels);
        writer.Write(sampleRate);
        writer.Write(sampleRate * channels * (bitsPerSample / 8));
        writer.Write((short)(channels * (bitsPerSample / 8)));
        writer.Write((short)bitsPerSample);
        writer.Write("data"u8.ToArray());
        writer.Write(dataSize);
        for (var i = 0; i < totalSamples; i++)
        {
            writer.Write((short)0);
        }
        writer.Flush();
        return stream.ToArray();
    }
}
