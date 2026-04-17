# mozgoslav — active TODO

Обновлено 2026-04-17. Iteration 7 закрыта + V2-roadmap (кроме macOS-only) реализована.

## Закрыто в последнем прогоне

- ✅ **Multi-provider LLM** — `ILlmProvider` / `ILlmProviderFactory` + `OpenAiCompatibleLlmProvider` / `AnthropicLlmProvider` / `OllamaLlmProvider`. Маршрутизация через `settings.LlmProvider`. BC-036 зелёный.
- ✅ **Chunking strategy review** — `docs/llm-chunking-review.md` (дефектов не найдено; три follow-up-заметки).
- ✅ **`BackupService.CreateAsync` async** — `Task.Run` обёртка для off-threadpool IO; `#pragma warning disable CA1849` снят.
- ✅ **UI CRUD для профилей** — create / edit / duplicate / delete; built-in 409 → toast; валидация пустого имени.
- ✅ **Command palette (Cmd+K)** — `kbar` интегрирован на root; 11 навигационных + 4 quick-action.
- ✅ **Onboarding wizard** — 9 шагов по ADR-007 §D15; Welcome с motion-анимацией; `onboardingComplete` флаг.
- ⚠️ **Global dictation shortcut — partial**. Electron `globalShortcut.register(CommandOrControl+Shift+Space)` + IPC + renderer-hook + `source:"global-hotkey"` в бэке. **macOS-native round-trip не верифицирован в sandbox — проверка на Mac: Input Monitoring + Accessibility права + фактический захват звука.**

## V2 roadmap — остаётся

- **Real `IAudioRecorder` (macOS AVFoundation):** заменить `NoopAudioRecorder`. Требует Swift + macOS + AVFoundation API. Брать структуру из meetily `audio/*`. **Невозможно в Linux-sandbox — только на Mac.**
- **`electron-builder --mac` packaging:** требует macOS-host. `electron-builder.yml` готов; запускать `npm --prefix frontend run dist:mac` на Mac.
- **Global dictation shortcut — финальная валидация на Mac:** AX permission prompt, запись PCM во время хоткея, clipboard/AX inject. Код написан, нужен живой прогон.

## Web-aware RAG (новое, груминг готов)

- **См. `docs/adr/ADR-008-web-rag.md`** — технический груминг: фичa «QA RAG умеет ходить в сеть / сёрфить». BC-каталог, архитектурные решения, риски приватности, non-goals. Реализация — следующая итерация.

## Chores — остаётся

- Свериться с meetily `transcript_processor.py` — стратегия chunking при апгрейде `OpenAiCompatibleLlmProvider.Chunk/Merge`. Текущий review показал расхождений нет, но meetily-источник до сих пор не читался.
- Проверить на Mac: `onGlobalHotkey` IPC round-trip, AX prompt, focus-app detection.

## Architecture debt (минорный)

- `IIdleResourceCache<T>` экспонирует оба `GetAsync` и `AcquireAsync/ReleaseAsync` — это историческая совместимость со старыми 7 тестами. Следующий рефакторинг может свернуть API к одному паттерну.
- Migration `0010_syncthing_settings` — marker-only (schema лёг из EF-конвенции). Если будет нужен explicit history row — авторизуем полноценно.
- No migration row auto-written for `llm_provider`; первая `SaveAsync` сеет. Fresh DB boots → fallback `openai_compatible`.

## Deferred / out-of-scope (повторяем из ADR-007)

- Calendar / meeting autostart (ADR-006 D-series).
- Native Swift `AVAudioEngine` helper (см. выше AVFoundation).
- Arbitrary new LLM providers (Groq, xAI, OpenRouter) — не востребовано.
- Real ML в Python sidecar (diarization / gender / emotion / NER) — стабы, реальные модели при деплое на Mac.
- Dark-mode визуальная полировка.
- Multi-language transcription beyond RU/EN.
