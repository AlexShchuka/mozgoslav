namespace Mozgoslav.Api.Models;

/// <summary>
/// Publicly-hosted models Mozgoslav can download. URLs point to HuggingFace so
/// downloads are verifiable against the original publishers. Default pick is the
/// Russian fine-tune because it beats the multilingual base by ~3 WER points on
/// conversational Russian speech.
/// </summary>
public static class ModelCatalog
{
    public static IReadOnlyList<CatalogEntry> All { get; } =
    [
        new(
            Id: "whisper-large-v3-russian-antony66",
            Name: "Whisper Large v3 Russian (antony66) — рекомендуется для RU",
            Description: "RU fine-tune на Common Voice 17 — WER 6.39% (vs 9.84% у базового). GGML-конверсия от Limtech.",
            Url: "https://huggingface.co/Limtech/whisper-large-v3-russian-ggml/resolve/main/ggml-model-q8_0.bin",
            SizeMb: 1600,
            Kind: ModelKind.Stt,
            IsDefault: true),
        new(
            Id: "whisper-large-v3-ru-podlodka",
            Name: "Whisper Large v3 Podlodka (bond005, RU fine-tune)",
            Description: "RU fine-tune на подкастах — заметно лучше на живой разговорной речи.",
            Url: "https://huggingface.co/bond005/whisper-large-v3-ru-podlodka/resolve/main/ggml-model-q8_0.bin",
            SizeMb: 1600,
            Kind: ModelKind.Stt,
            IsDefault: false),
        new(
            Id: "whisper-large-v3-q8",
            Name: "Whisper Large v3 (Q8, multilingual)",
            Description: "Мультиязычный дефолт от ggerganov. Стабилен, но на RU проигрывает fine-tune'ам.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q8_0.bin",
            SizeMb: 1500,
            Kind: ModelKind.Stt,
            IsDefault: false),
        new(
            Id: "whisper-large-v3-turbo",
            Name: "Whisper Large v3 Turbo",
            Description: "Быстрее, чуть хуже качество, multilingual.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin",
            SizeMb: 874,
            Kind: ModelKind.Stt,
            IsDefault: false),
        new(
            Id: "whisper-medium",
            Name: "Whisper Medium",
            Description: "Лёгкая модель для слабых машин.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
            SizeMb: 500,
            Kind: ModelKind.Stt,
            IsDefault: false),
        new(
            Id: "silero-vad",
            Name: "Silero VAD v6.2.0",
            Description: "Voice Activity Detection — пропускает тишину перед Whisper.",
            Url: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
            SizeMb: 4,
            Kind: ModelKind.Vad,
            IsDefault: true),
    ];

    public static CatalogEntry? TryGet(string id) =>
        All.FirstOrDefault(e => e.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
}
