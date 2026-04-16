# Meetily → mozgoslav — что унаследовано и что решено иначе

Краткая сводка архитектурных решений, где mozgoslav сознательно расходится с референсным meetily, и где meetily остаётся полезным референсом при будущих доработках.

## Осознанно иначе

| Слой | Meetily | mozgoslav | Почему |
|---|---|---|---|
| Desktop shell | Tauri + Next.js | Electron + React + Redux-Saga | Знакомый стек. |
| Backend | Python FastAPI | C# .NET 10 + EF Core | Знакомый стек / архитектурные паттерны. |
| STT | Whisper.cpp subprocess | Whisper.net native | Без subprocess wrap, «на века». |
| LLM | Ollama + Claude + Groq + OpenRouter | OpenAI-compatible (LM Studio / Ollama) | Минимум; расширим, если понадобится. |

## На будущее: брать референс из meetily при реализации

- `IAudioRecorder` (сейчас `NoopAudioRecorder`) — шаблон модульной структуры из meetily:
  `audio/devices/`, `audio/capture/`, `audio/pipeline.rs`. Особенно полезно, когда будем писать
  нативный macOS recorder (AVFoundation) — см. `frontend/src-tauri/src/audio/recording_manager.rs` в meetily.
- Ring-buffer mixing + VAD-filter pipeline — когда добавим live transcription, структура
  `AudioMixerRingBuffer` / `ProfessionalAudioMixer` + VAD из `pipeline.rs` — прямой референс.
- GPU fallback chain (Metal / CUDA / Vulkan / CPU) — Whisper.net CoreML уже покрывает macOS,
  но meetily даёт пример дерева fallback'ов для кросс-платформенного сценария.
- Chunking стратегии для длинных транскриптов — при апгрейде
  `OpenAiCompatibleLlmService.Chunk/Merge` свериться с `transcript_processor.py` из meetily.

## Где meetily НЕ релевантен

- `MeetingManager` / `Sidebar context` — наша feature-base + Redux-Saga делает то же самое иначе.
- Tauri commands / events — Electron IPC bridge (`preload.ts`) закрывает тот же use-case.
- Python backend summarization — весь pipeline уже на C# .NET 10.
