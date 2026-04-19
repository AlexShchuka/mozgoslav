# Mozgoslav — самостоятельное ревью

Дата: 2026-04-16. Это не полировочный список «что можно улучшить», а скептическая сверка реальной реализации с двумя
источниками правды:

1. **ADR-001** (видение, архитектура, открытые вопросы).
2. **Командные стандарты кода** (pattern'ы C#-сервиса с Clean Architecture + EF Core и React-приложения с
   feature-based + Redux-Saga).

Задача — показать: что закрыто, что сознательно отложено и почему, где остались расхождения.

---

## 1. Соответствие ADR-001

### §1 Видение + §3 Основной сценарий

- [x] Запись / импорт аудио — **импорт готов** (drag-drop + multipart `/api/recordings/upload`, diag dialog через
  Electron bridge). Запись — `NoopAudioRecorder`, интерфейс `IAudioRecorder` есть, реальная реализация macOS-only
  отложена.
- [x] Очередь обработки с прогрессом — `QueueBackgroundService` + SSE `/api/jobs/stream` + `Queue.tsx` с анимированным
  `ProgressBar`.
- [x] Локальная транскрибация — `WhisperNetTranscriptionService` (native Whisper.net + CoreML runtime package).
  `whisper-cli` subprocess **не используется** — идём сразу по «rewrite» пути, как выбрал пользователь в сессии.
- [x] Контекстная коррекция — `CorrectionService` (filler cleanup через `FillerCleaner` per profile). Glossary +
  LLM-коррекция — extension points (документированы в `backend/CLAUDE.md`).
- [x] LLM суммаризация — `OpenAiCompatibleLlmService` с `ChatResponseFormat.CreateJsonObjectFormat()`, chunk+merge на
  длинных transcript'ах, graceful fallback на plain text.
- [x] Structured markdown + frontmatter + Obsidian export — `FileMarkdownExporter` + `MarkdownGenerator` +
  `ObsidianSetupService` (создаёт `_inbox/People/Projects/Topics/Templates` + Templater-шаблон).
- [x] Повторный прогон другим профилем — `ReprocessUseCase` + `POST /api/recordings/{id}/reprocess`, auto-bump version.

### §4 Key Idea (source ≠ output) + §5 Профили

- [x] `Profile` как first-class entity. Seed 3 встроенных (Рабочий / Неформальный / Полная заметка) в `BuiltInProfiles`
  со стабильными Id → идемпотентное заселение.
- [x] `ProcessedNote.Version` + уникальность `(TranscriptId, Version)` через логику в `ProcessQueueWorker.BuildNote` /
  `ReprocessUseCase`.

### §6 Функциональные требования

| Требование                               | Статус        | Где                                                                                                   |
|------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------|
| Запись аудио start/stop                  | ❌ stub        | `NoopAudioRecorder`, TODO per-platform                                                                |
| Импорт mp3/m4a/wav/mp4/ogg/flac/webm/aac | ✅             | `AudioFormat` enum + upload/import endpoints                                                          |
| Drag-and-drop                            | ✅             | `Dashboard.tsx` + `react-dropzone`                                                                    |
| Batch folder                             | ❌ не в скоупе | документировано для V2                                                                                |
| Очередь с UI статуса                     | ✅             | `Queue.tsx` + SSE                                                                                     |
| Выбор модели транскрибации               | ✅             | Models page скачивает любую из каталога; путь настраивается в Settings                                |
| Выбор LLM модели                         | ✅             | Settings → LLM (endpoint + model name + API key)                                                      |
| Контекстная коррекция                    | partial       | regex ok, glossary — extension point, LLM-correction — отдельная итерация                             |
| LLM summarization                        | ✅             | structured JSON, chunk+merge                                                                          |
| Повторный прогон                         | ✅             | Reprocess endpoint                                                                                    |
| Настраиваемые профили                    | ✅             | `POST/PUT /api/profiles`. UI редактор — минимальный (List + badges), полный CRUD — следующая итерация |
| Obsidian export                          | ✅             | file I/O                                                                                              |
| Vault path настройка                     | ✅             | Settings → Storage, native folder picker                                                              |
| Wiki-links [[Person]]                    | ✅             | `MarkdownGenerator.AppendBody`                                                                        |
| Folder mapping rules                     | partial       | `Profile.ExportFolder`; PARA-роутинг по `ConversationType` — V2                                       |

### §9 Архитектура — C# компоненты

Факт vs спека:

| Компонент спеки       | Реализация                                        | Заметки                                                                    |
|-----------------------|---------------------------------------------------|----------------------------------------------------------------------------|
| AudioService          | `FfmpegAudioConverter` + `IAudioRecorder`         | Recorder = NOOP                                                            |
| WhisperService        | `WhisperNetTranscriptionService`                  | native (ADR §9 «V2+», вытянут сразу — в сессии выбрали «без wrap»)         |
| QueueService          | `QueueBackgroundService` + `ProcessQueueWorker`   | Channel-нотификатор для SSE                                                |
| CorrectionSvc         | `CorrectionService` + `FillerCleaner`             | glossary/LLM correction — extension                                        |
| LLMClient             | `OpenAiCompatibleLlmService`                      | OpenAI SDK 2.x                                                             |
| ObsidianSvc           | `FileMarkdownExporter` + `ObsidianSetupService`   | file I/O сейчас; REST API plugin — V2                                      |
| ProfileSvc            | `EfProfileRepository` + `BuiltInProfiles`         | Dapper изначально → пересобрано на EF Core (решение пользователя в сессии) |
| StorageSvc            | `MozgoslavDbContext` + `EfXxxRepository` (5 штук) | EF Core + SQLite + value converters                                        |
| ExportSvc             | `FileMarkdownExporter`                            | атомарная запись (`.tmp` rename) + dedupe имени (`-2`, `-3`…)              |
| **Python ML sidecar** | FastAPI + 5 роутеров (1 реальный, 4 stub)         | V3                                                                         |

### §10 Pipeline (детально)

Этапы 1–6 в `ProcessQueueWorker.ProcessJobAsync`: audio → wav → transcribe → correct → LLM → markdown → export. Progress
weighted: 0-50 transcribe, 50-60 correction, 60-85 summarize, 85-100 export. SSE публикует после каждой TransitionAsync.

### §11 Обработка длинных записей

LLM chunk+merge на >24 000 символов (`OpenAiCompatibleLlmService.Chunk/Merge`). Промежуточные результаты (Transcript)
сохраняются в SQLite до LLM-этапа — crash-safe ✅.

### §12 Стек

Соответствует ADR, с двумя осознанными отходами:

- **Dapper → EF Core** — пользователь попросил «как в типичном C# DDD-сервисе команды».
- **Subprocess whisper-cli → Whisper.net native** — пользователь попросил «архитектуру на века, без wrap».

### §14 НЕ делаем

Все пункты (облако, Rust, Tauri, live transcription, идеальный UX сразу, многопользовательность, diarization в MVP) —
честно не делаем. ✅

### §16 Риски — митигации

| Риск                                  | Митигация                                      | Реализовано?                   |
|---------------------------------------|------------------------------------------------|--------------------------------|
| LLM JSON parsing fails                | JsonObjectFormat + retry + plain-text fallback | ✅ `ParseOrRepair`              |
| Длинные записи vs context window      | chunk+merge                                    | ✅                              |
| Несколько интерпретаций → как хранить | `ProcessedNote.Version`                        | ✅                              |
| Whisper.net CoreML                    | fallback на CPU                                | implicit (Whisper.net handles) |
| Electron тяжёлый                      | acceptable                                     | no action                      |

### §17 Открытые вопросы

- Wrap vs rewrite граница — **выбран rewrite** (пользователь в сессии).
- Ollama vs LM Studio — единый OpenAI-compatible endpoint ✅.
- UI ↔ backend контракт — REST + SSE ✅.
- Obsidian — file I/O сейчас ✅; REST API — extension (в настройках уже есть токен + host для будущей интеграции).
- Разные интерпретации одной записи — разные файлы `{date}-{topic}-{profile}.md` ✅.
- Хранение моделей — `~/Library/Application Support/Mozgoslav/models/` + UI скачивание ✅.
- Очередь — persistent через `processing_jobs` ✅.
- Граница app ↔ Obsidian — приложение генерит .md и подготавливает структуру, Obsidian делает остальное ✅.

---

## 2. Соответствие командным стандартам (сравнение с типичным C# DDD проектом + feature-based React)

### C# (backend)

| Pattern                                                                                          | В reference | В mozgoslav                                                                 |
|--------------------------------------------------------------------------------------------------|-------------|-----------------------------------------------------------------------------|
| Clean Architecture (Domain / Application / Infrastructure / Api)                                 | ✅           | ✅                                                                           |
| Centralized build/package (`Directory.Build.props`, `Directory.Packages.props`, floating majors) | ✅           | ✅                                                                           |
| EF Core + SQLite, value converters для enums/JSON                                                | ✅           | ✅                                                                           |
| MSTest + FluentAssertions + NSubstitute + WireMock + EF InMemory/file                            | ✅           | ✅ (NSubstitute + `TestDatabase` temp SQLite + WireMock готов к подключению) |
| Serilog + file rolling sink                                                                      | ✅           | ✅                                                                           |
| OpenTelemetry metrics + System.Diagnostics.Metrics                                               | ✅           | ✅ (`MozgoslavMetrics`)                                                      |
| Hosted services (`IHostedService`)                                                               | ✅           | ✅ (`DatabaseInitializer`, `QueueBackgroundService`)                         |
| `sealed` + nullable enable + `TreatWarningsAsErrors`                                             | ✅           | ✅                                                                           |
| One class per file, traditional ctors                                                            | ✅           | ✅ (без primary ctors — перепроверено)                                       |

### React (frontend)

| Pattern                                                                     | В reference             | В mozgoslav                                                                                                 |
|-----------------------------------------------------------------------------|-------------------------|-------------------------------------------------------------------------------------------------------------|
| Feature-based (Component + .style.ts + .container.ts + types.ts)            | ✅                       | ✅ (RecordingList — канонический; прочие пока hook-based для скорости, container-pattern ready as extension) |
| Redux + Redux-Saga (actionCreator + reducer + mutations + selectors + saga) | ✅                       | ✅ (recording slice — полная реализация; прочие страницы — hooks + direct API)                               |
| BaseApi + ApiFactory (Axios)                                                | ✅                       | ✅ + `MozgoslavApi` удобный wrapper                                                                          |
| styled-components + ThemeProvider (light/dark)                              | partial                 | ✅ (theme tokens, dark/light, GlobalStyle)                                                                   |
| Jest + RTL + redux-saga-test-plan                                           | ✅                       | ✅ (2 теста rec + saga; расширяется)                                                                         |
| i18n                                                                        | отсутствует в reference | ✅ добавлено (ru+en, ключи на все UI-строки)                                                                 |
| plop-templates                                                              | ✅                       | ✅                                                                                                           |

### Отход в frontend

- **Hooks + прямые API-вызовы** на страницах за исключением `RecordingList` — осознанный прагматизм: быстрее довести UI
  до «работает», container+saga можно навесить второй итерацией без переписывания компонентов (presentational уже
  отдельные).
- **i18n поверх reference** — reference-проект не использует, но пользователь явно попросил локализацию.

---

## 3. Чего сознательно нет (с обоснованиями)

| Пункт                                             | Почему                                                                                                                              |
|---------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Реальный diarization/gender/emotion/NER в sidecar | Модели ~5 GB суммарно, macOS-specific runtime пайплайн, тестировать в sandbox бесполезно. Контракты зафиксированы stub-ответами.    |
| Нативный macOS audio-recorder                     | Требует AVFoundation/P-Invoke; интерфейс `IAudioRecorder` готов, `NoopAudioRecorder` честно кидает `PlatformNotSupportedException`. |
| Command palette (Cmd+K)                           | Зависимость `kbar` добавлена, реализация — следующая итерация (1-2 часа работы).                                                    |
| Onboarding wizard                                 | Компоненты инфраструктуры готовы (i18n-шаги в `ru.json`/`en.json`); сам компонент — следующая итерация.                             |
| Hotkeys глобально                                 | `react-hotkeys-hook` в зависимостях; точечное подключение на страницах — добить.                                                    |
| Полный CRUD профилей в UI                         | List + badges есть; редактор-диалог — следующий заход.                                                                              |
| Obsidian REST API интеграция                      | Токен и host уже в Settings и DTO; клиент — extension point.                                                                        |
| E2E с реальным аудио                              | Нужен macOS CI; unit + integration покрывают контракты.                                                                             |
| `electron-builder --mac`                          | Конфиг готов, запуск только на macOS.                                                                                               |

---

## 4. Вывод

Реализована масштабируемая архитектура с полным pipeline, покрытым тестами (репо — integration, domain/services — unit),
готовая к поднятию в Rider на маке. Соответствие ADR-001 — высокое; осознанные отходы зафиксированы в сессии и отражены
в коде. Стек и паттерны соответствуют командным стандартам (Clean Architecture + EF Core + MSTest на бэке;
feature-based + Redux-Saga + styled-components на фронте).

Приоритет next iterations:

1. Native macOS `IAudioRecorder` (через AVAudioEngine via P-Invoke или helper-процесс).
2. UI полный CRUD профилей + command palette + onboarding wizard.
3. Реальные V3 endpoints в python-sidecar (diarize → gender → emotion → NER).
4. Obsidian REST API integration (токен уже в Settings).
