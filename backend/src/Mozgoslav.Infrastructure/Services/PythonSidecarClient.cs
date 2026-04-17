using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Default <see cref="IPythonSidecarClient"/> — one HTTP call per
/// endpoint, domain records in / domain records out, typed-exception
/// for the 503 model-not-installed envelope.
///
/// The client does NOT retry or cache — each call is a thin projection
/// onto the sidecar's contract so higher-level pipelines (queue worker,
/// dictation polish) can decide whether to degrade or surface the
/// error. A network-level failure surfaces as the underlying
/// <see cref="HttpRequestException"/> unchanged.
/// </summary>
public sealed class PythonSidecarClient : IPythonSidecarClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly ILogger<PythonSidecarClient> _logger;

    public PythonSidecarClient(HttpClient httpClient, ILogger<PythonSidecarClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<SidecarDiarizeResult> DiarizeAsync(string audioPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(audioPath);
        var body = await PostAsync<DiarizeDto>(
            "/api/diarize",
            new AudioPathDto(audioPath),
            ct);
        return new SidecarDiarizeResult(
            Segments: body.Segments.Select(s => new SidecarSpeakerSegment(s.Speaker, s.Start, s.End)).ToList(),
            NumSpeakers: body.NumSpeakers);
    }

    public async Task<SidecarGenderResult> GenderAsync(string audioPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(audioPath);
        var body = await PostAsync<GenderDto>(
            "/api/gender",
            new AudioPathDto(audioPath),
            ct);
        return new SidecarGenderResult(body.Gender, body.Confidence);
    }

    public async Task<SidecarEmotionResult> EmotionAsync(string audioPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(audioPath);
        var body = await PostAsync<EmotionDto>(
            "/api/emotion",
            new AudioPathDto(audioPath),
            ct);
        return new SidecarEmotionResult(
            body.Emotion,
            body.Valence,
            body.Arousal,
            body.Dominance);
    }

    public async Task<SidecarNerResult> NerAsync(string text, CancellationToken ct)
    {
        var body = await PostAsync<NerDto>(
            "/api/ner",
            new TextDto(text ?? string.Empty),
            ct);
        return new SidecarNerResult(
            People: body.People,
            Orgs: body.Orgs,
            Locations: body.Locations,
            Dates: body.Dates);
    }

    // ---- Internals --------------------------------------------------------

    private async Task<TResponse> PostAsync<TResponse>(string path, object payload, CancellationToken ct)
        where TResponse : class
    {
        using var response = await _httpClient.PostAsJsonAsync(path, payload, JsonOptions, ct);

        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            await ThrowModelUnavailableAsync(response, ct);
        }

        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<TResponse>(JsonOptions, ct)
            ?? throw new InvalidOperationException($"Sidecar returned empty body for {path}");
        return body;
    }

    private async Task ThrowModelUnavailableAsync(HttpResponseMessage response, CancellationToken ct)
    {
        ModelNotInstalledDto? envelope;
        try
        {
            envelope = await response.Content.ReadFromJsonAsync<ModelNotInstalledDto>(JsonOptions, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Sidecar 503 had a non-standard body");
            envelope = null;
        }

        if (envelope?.Error == "model_not_installed" && !string.IsNullOrEmpty(envelope.ModelId))
        {
            throw new SidecarModelUnavailableException(
                modelId: envelope.ModelId,
                downloadUrl: envelope.DownloadUrl ?? string.Empty,
                hint: envelope.Hint ?? "Download the model via Settings → Models.");
        }

        // Unexpected 503 — let EnsureSuccessStatusCode in the caller wrap it.
        _logger.LogWarning(
            "Sidecar returned 503 without the expected model_not_installed envelope: {@Envelope}",
            envelope);
    }

    // ---- Wire DTOs --------------------------------------------------------

    private sealed record AudioPathDto(
        [property: JsonPropertyName("audio_path")] string AudioPath);

    private sealed record TextDto(
        [property: JsonPropertyName("text")] string Text);

    private sealed record DiarizeDto(
        [property: JsonPropertyName("segments")] List<SpeakerSegmentDto> Segments,
        [property: JsonPropertyName("num_speakers")] int NumSpeakers);

    private sealed record SpeakerSegmentDto(
        [property: JsonPropertyName("speaker")] string Speaker,
        [property: JsonPropertyName("start")] double Start,
        [property: JsonPropertyName("end")] double End);

    private sealed record GenderDto(
        [property: JsonPropertyName("gender")] string Gender,
        [property: JsonPropertyName("confidence")] double Confidence);

    private sealed record EmotionDto(
        [property: JsonPropertyName("emotion")] string Emotion,
        [property: JsonPropertyName("valence")] double Valence,
        [property: JsonPropertyName("arousal")] double Arousal,
        [property: JsonPropertyName("dominance")] double Dominance);

    private sealed record NerDto(
        [property: JsonPropertyName("people")] List<string> People,
        [property: JsonPropertyName("orgs")] List<string> Orgs,
        [property: JsonPropertyName("locations")] List<string> Locations,
        [property: JsonPropertyName("dates")] List<string> Dates);

    private sealed record ModelNotInstalledDto(
        [property: JsonPropertyName("error")] string? Error,
        [property: JsonPropertyName("model_id")] string? ModelId,
        [property: JsonPropertyName("download_url")] string? DownloadUrl,
        [property: JsonPropertyName("hint")] string? Hint);
}
