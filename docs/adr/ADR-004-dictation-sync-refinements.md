# ADR-004: Dictation & Sync Refinements (post-research)

- **Status:** Proposed — **включается в scope текущего launch MR**, выполняется агентом вместе с ADR-003.
- **Date:** 2026-04-16
- **Related:** ADR-002 (Dictation), ADR-003 (Syncthing)

## Context

После драфтинга ADR-002 / ADR-003 провёл ресёрч жалоб пользователей на SuperWhisper / Wispr Flow + Syncthing issues. Нашёл ряд типовых проблем / фич, которые добавляют ценность малой кровью и решают заранее известные болячки. Фиксирую здесь, чтобы агент-реализатор сделал сразу, а не доделывать вторым заходом.

Источники findings — `/home/coder/workspace/today-session-results/known-issues-and-missing-features.md`.

## Refinements to ADR-002 (Dictation)

### R1. Custom vocabulary / initial_prompt

- Расширить **существующий** `AppSettingsDto.Dictation` (`backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs`, уже содержит 12 dictation-полей от Dictation-агента) полем `Vocabulary: string[]`.
- Mirror в `IAppSettings` + parser в `EfAppSettings`.
- `DictationSessionManager.StartAsync` — передаёт текущий `Vocabulary` в `IStreamingTranscriptionService` (либо через новый параметр `initialPrompt`, либо через расширение start-context record).
- `WhisperNetTranscriptionService` (который Dictation-агент уже расширил до `IStreamingTranscriptionService`) — прописывает `InitialPrompt` в опции Whisper.net builder chain.
- Seed дефолт: `[]` (пустой массив) через `DatabaseInitializer`.
- Импакт: Whisper резко меньше ошибается на доменной лексике.

### R2. Per-app correction profiles

- Расширить `AppSettingsDto.Dictation` полем `AppProfiles: Dictionary<string, string>` (bundleId → profileId).
- `DictationSessionManager.StopAsync`:
  - Получает focused app bundle id через Swift helper (`helpers/MozgoslavDictationHelper` — `FocusedAppDetector.swift` уже существует; использует JSON-RPC метод `inject.detectTarget` или аналогичный — сверить с реализацией).
  - Если в `AppProfiles` есть override для bundleId → использовать этот `CorrectionProfile`.
  - Иначе — дефолтный профиль.
- Сиды дефолтов (без UI), через `DatabaseInitializer`:
  ```json
  {
    "com.microsoft.VSCode": "code-profile",
    "com.google.Chrome": "default",
    "slack.com": "informal-profile"
  }
  ```
- Импакт: разный тон в IDE (сохраняем код и идентификаторы) vs чат (неформально, убираем филлеры).

### R3. AX inject timeout + clipboard fallback

- Изменения на стороне Swift helper: `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/TextInjectionService.swift` + `InjectionStrategy.swift`:
  - Параметр `timeoutMs` (default 200) в JSON-RPC команде `inject.text`.
  - AX write попытка с timeout; при превышении → fallback на clipboard paste (UIPasteboard + CGEventPost Cmd+V).
  - Save/restore предыдущего clipboard'а.
  - Возвращает `{ok: true, usedStrategy: "ax"|"cgevent"|"clipboard"}`.
- **Never freeze target app.** Wispr Flow жалоба.

### R4. Whisper model unload timer

- `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — добавить `System.Threading.Timer`, сбрасываемый при каждом `TranscribeStreamAsync`/`TranscribeAsync`; через **N минут inactivity** (default: 10 min) — `Dispose()` модели + `_model = null`.
- При следующем вызове — auto-reload (1-2 сек задержка на первую).
- N — конфигурируется через `AppSettingsDto.Dictation.ModelUnloadMinutes` (int, default 10).
- Thread safety: использовать existing lock или `Interlocked`.
- Impact: идле-RAM usage ~50 MB вместо 800 MB.

### R5. Audio buffer save-to-temp для crash recovery

- `DictationSessionManager.StartAsync` (`backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs`) — при старте сессии открывает FileStream в:
  - macOS: `~/Library/Application Support/Mozgoslav/temp/dictation-{sessionId}.pcm`
  - Linux dev: `Path.GetTempPath()/mozgoslav-dictation-{sessionId}.pcm`
- Каждый incoming `AudioChunk` → append в файл (raw PCM 16kHz mono float32).
- После успешного `StopAsync` + inject → удаляем temp-файл.
- На старте `DictationSessionManager` (через `IHostedService` hook — добавить `StartAsync` логику) → scan temp/ на orphan-файлы. Если есть — просто логируем WARN с путём (восстановление в UI — V2, сейчас оставляем файл для ручной отладки).
- Новый параметр `AppSettingsDto.Dictation.TempAudioPath` (optional override).
- SuperWhisper жалоба «теряет данные» — этим закрываем.

### R6. Tray icon state + sound only

- НЕ использовать `new Notification(...)` в Electron-коде.
- Tray state уже реализован в `frontend/electron/dictation/TrayManager.ts` (Dictation-агент). Проверить что нигде не появилось вызовов Notification API.
- Звуковой feedback на start/stop — через existing macOS system sounds: `afplay /System/Library/Sounds/Tink.aiff` и `Pop.aiff`, вызов из Swift helper или из Electron через native API.
- Opt-in через `AppSettingsDto.Dictation.SoundFeedback: bool` (default: true). Параметр уже может быть — сверить с текущими полями AppSettingsDto.

## Refinements to ADR-003 (Syncthing)

### R7. Extended default .stignore

В каждой из 3 папок при создании `SyncthingFolderInitializer` пишет `.stignore`:

```
# System
.DS_Store
Thumbs.db
desktop.ini
ehthumbs.db

# Partial / temp
*.partial
*.tmp
*.swp
*~

# Obsidian workspace (user-specific state)
.obsidian/workspace
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/hotkeys.json
.obsidian/plugins/*/data.json

# Dev artifacts (если vault касается dev-папок)
node_modules/
.git/
.gitignore

# Trash
.trash/
.trashed-*
```

### R8. Versioning config verify

- В `SyncthingConfigService` явно прописать:
  - `mozgoslav-recordings`: versioning = `staggered`, `maxAge = 30 days`, `versionsPath = .stversions/`.
  - `mozgoslav-notes`: versioning = `trashcan`, `cleanoutDays = 30`.
  - `mozgoslav-obsidian-vault`: versioning = `trashcan`, `cleanoutDays = 14`.
- Integration test: после init config.xml содержит все три `<versioning>` блока корректно.

### R9. Mobile setup documentation

- `docs/sync-mobile-setup.md` — новый гайд:
  - Android: установи `Syncthing-Fork` (F-Droid или Google Play). После pairing:
    - Включи **WiFi-only** (Settings → Run conditions → «Sync only on WiFi»).
    - Включи **Respect master data limit** (если Android ≥ 10).
    - Scheduled scan interval: 300 сек (5 мин) вместо filesystem watcher — экономит батарею.
  - iOS: установи `Möbius Sync` ($19.99) или `synctrain` (free, iOS 16+).
    - iOS не может держать Syncthing в background долго — sync случается когда приложение открыто или при зарядке.
    - Для iOS 26+ есть «background execute on request» — включи.
- Ссылка на этот гайд — в pairing-QR modal: "📱 Setup help for your phone".

### R10. Sync status endpoint

- `GET /api/sync/status` → `{ folders: [{id, state, completionPct, conflicts: number}], devices: [{id, name, connected, lastSeen}] }`.
- Используется для debug + future UI.

## Design discipline (применяется ко всем R*)

- **SRP:** каждый рефайнмент — отдельный класс/метод, не кластеризовать в один god-class.
- **KISS:** R4 (unload timer) — простой `System.Threading.Timer`, не hazelcast-style.
- **DRY:** R1 vocabulary → общий prompt-builder и для dictation, и для import-recording (можно переиспользовать в `ProcessQueueWorker`).
- **Reuse existing:** `CorrectionProfile` уже есть — R2 использует, не создаёт альтернативу.

## Consequences

### Положительные
- Решены 6 известных pain-points конкурентов заранее.
- Ценные фичи (custom vocab, per-app profiles) — дёшево в коде.
- Пользователь не теряет данные (R5).
- Не жрёт RAM (R4).
- Не фризит другие приложения (R3).

### Отрицательные
- +~10-15 файлов кода к тому что уже в ADR-002/003.
- R2 per-app profiles — без UI для редактирования (правка `settings.db` прямо). User preference «UI не меняем в этом MR».
- R9 документация — **не исчерпывающая**, только базовые рекомендации. Полная troubleshooting-секция — позже.

### Out of scope этого ADR
- UI для настройки dictation / sync (отложено).
- Advanced sync features (encryption-at-rest, selective sync, bandwidth limit).
- Calendar integration, RAG Q&A, diarization — отдельные ADR.

## Implementation plan

**Этот ADR реализуется агентом, которому даётся одновременно с ADR-003 (Syncthing).** Порядок:

1. R7 (`.stignore`) + R8 (versioning) + R9 (mobile docs) + R10 (status endpoint) — вместе с основной Syncthing-реализацией.
2. R1-R6 (Dictation refinements) — накладываются поверх кода Dictation-агента (который уже завершил основной скоуп ADR-002).
3. Tests для каждого R* — в существующие test-классы + новые где уместно.
4. Final verification — полный green-цикл (backend + frontend + python).

## References
- `/home/coder/workspace/today-session-results/known-issues-and-missing-features.md` — исходные findings.
- SuperWhisper / Wispr Flow Reddit threads — см same file.
- [Whisper.net initial_prompt docs](https://github.com/sandrohanea/whisper.net)
