using System;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Services;

public sealed class OpenAiCompatibleCapabilitiesProbe : ILlmCapabilitiesProbe
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenAiCompatibleCapabilitiesProbe> _logger;

    public OpenAiCompatibleCapabilitiesProbe(
        IHttpClientFactory httpClientFactory,
        ILogger<OpenAiCompatibleCapabilitiesProbe> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<LlmCapabilities> ProbeAsync(string endpoint, string model, string apiKey, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(endpoint);

        var baseUri = new Uri(endpoint.TrimEnd('/'));
        var chatUri = new Uri(baseUri, "/v1/chat/completions");
        var effectiveModel = string.IsNullOrWhiteSpace(model) ? "default" : model;
        var effectiveKey = string.IsNullOrWhiteSpace(apiKey) ? "lm-studio" : apiKey;

        var supportsToolCalling = await ProbeToolCallingAsync(chatUri, effectiveModel, effectiveKey, ct);
        var supportsJsonMode = await ProbeJsonModeAsync(chatUri, effectiveModel, effectiveKey, ct);
        var (ctxLength, tokensPerSecond) = await ProbePerfAsync(chatUri, effectiveModel, effectiveKey, ct);

        _logger.LogInformation(
            "LLM capabilities probed: toolCalling={ToolCalling} jsonMode={JsonMode} ctx={Ctx} tps={Tps:F1}",
            supportsToolCalling, supportsJsonMode, ctxLength, tokensPerSecond);

        return new LlmCapabilities(
            SupportsToolCalling: supportsToolCalling,
            SupportsJsonMode: supportsJsonMode,
            CtxLength: ctxLength,
            TokensPerSecond: tokensPerSecond,
            ProbedAt: DateTimeOffset.UtcNow);
    }

    private async Task<bool> ProbeToolCallingAsync(Uri chatUri, string model, string apiKey, CancellationToken ct)
    {
        var body = new
        {
            model,
            max_tokens = 10,
            messages = new[] { new { role = "user", content = "Say hi." } },
            tools = new[]
            {
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "probe",
                        description = "probe",
                        parameters = new
                        {
                            type = "object",
                            properties = new { },
                            required = Array.Empty<string>()
                        }
                    }
                }
            }
        };

        try
        {
            using var response = await PostAsync(chatUri, body, apiKey, ct);
            if (!response.IsSuccessStatusCode)
            {
                return false;
            }
            var content = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(content);
            if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
            {
                var first = choices[0];
                if (first.TryGetProperty("message", out var msg) &&
                    msg.TryGetProperty("tool_calls", out var tc) &&
                    tc.ValueKind == JsonValueKind.Array)
                {
                    return true;
                }
                if (first.TryGetProperty("finish_reason", out var fr) &&
                    fr.GetString() == "tool_calls")
                {
                    return true;
                }
            }
            return false;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Tool-calling probe failed");
            return false;
        }
    }

    private async Task<bool> ProbeJsonModeAsync(Uri chatUri, string model, string apiKey, CancellationToken ct)
    {
        var body = new
        {
            model,
            max_tokens = 20,
            messages = new[] { new { role = "user", content = "Reply with a JSON object: {\"ok\":true}" } },
            response_format = new { type = "json_object" }
        };

        try
        {
            using var response = await PostAsync(chatUri, body, apiKey, ct);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "JSON-mode probe failed");
            return false;
        }
    }

    private async Task<(int ctxLength, double tokensPerSecond)> ProbePerfAsync(
        Uri chatUri, string model, string apiKey, CancellationToken ct)
    {
        var body = new
        {
            model,
            max_tokens = 10,
            messages = new[] { new { role = "user", content = "Hi." } }
        };

        try
        {
            var sw = Stopwatch.StartNew();
            using var response = await PostAsync(chatUri, body, apiKey, ct);
            sw.Stop();

            if (!response.IsSuccessStatusCode)
            {
                return (0, 0);
            }

            var content = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(content);

            var ctxLength = 0;
            var totalTokens = 0;
            if (doc.RootElement.TryGetProperty("usage", out var usage))
            {
                if (usage.TryGetProperty("prompt_tokens", out var pt))
                {
                    ctxLength = pt.GetInt32();
                }
                if (usage.TryGetProperty("total_tokens", out var tt))
                {
                    totalTokens = tt.GetInt32();
                }
            }

            var elapsedSeconds = sw.Elapsed.TotalSeconds;
            var tps = elapsedSeconds > 0 && totalTokens > 0
                ? totalTokens / elapsedSeconds
                : 0;

            return (ctxLength, tps);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogDebug(ex, "Performance probe failed");
            return (0, 0);
        }
    }

    private async Task<HttpResponseMessage> PostAsync(Uri uri, object body, string apiKey, CancellationToken ct)
    {
        using var client = _httpClientFactory.CreateClient("llm");
        var json = JsonSerializer.Serialize(body, JsonOpts);
        using var request = new HttpRequestMessage(HttpMethod.Post, uri);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        return await client.SendAsync(request, ct);
    }
}
