# mozgoslav — active TODO

## V2 roadmap (design first)
- **Global dictation shortcut (macOS):** press-to-talk в любом app через Electron `globalShortcut` + streaming Whisper.net + clipboard/AX inject. Требует ADR + BDD.
- **Real `IAudioRecorder` (macOS AVFoundation):** заменить `NoopAudioRecorder`. Брать структуру из meetily `audio/*` (см. `docs/meetily-inheritance.md`).
- **Multi-provider LLM:** расширить `OpenAiCompatibleLlmService` до Ollama + Claude + Groq + OpenRouter, как в meetily.
- **UI CRUD для профилей:** редактор-диалог (List + badges уже есть).
- **Command palette (Cmd+K):** `kbar` зависимость уже в `package.json`.
- **Onboarding wizard:** i18n-шаги уже готовы в `ru.json` / `en.json`.

## Chores
- Свериться с meetily `transcript_processor.py` — стратегия chunking при апгрейде
  `OpenAiCompatibleLlmService.Chunk/Merge`.
- `electron-builder --mac` packaging (требует macOS host) — нужен только когда будем паковать релиз.
- `BackupService.CreateAsync` — перейти на `ZipFile.OpenAsync` (.NET 10) или хотя бы
  `Task.Run(...)`, сейчас synchronous ZipFile.Open под `#pragma warning disable CA1849`.
