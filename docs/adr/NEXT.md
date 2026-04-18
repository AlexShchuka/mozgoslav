# NEXT — активная очередь работы

- **Status:** Active queue. Пункт выполнили → удалили из файла.
- **Date:** 2026-04-18
- **Scope:** only что-то реализуем прямо сейчас или в ближайшей итерации. Backlog (то, что отложено) — `ADR-014-unrealized-backlog.md`. Post-v1.0 production — `POSTRELEASE.md`. Новые архитектурные решения — `ADR-016`, `ADR-017`.

## Critical — блокирует релиз / деградация основного флоу

### D1 — Dictation: запись не доезжает до приложения (bug)

**Симптом:** после нажатия Stop файл либо не существует, либо лежит не там. Должен автоматически появиться в списке `Recording` в UI.

**Что проверять (из кода):**

1. `backend/src/Mozgoslav.Api/Endpoints/RecordingEndpoints.cs` §109/141 — генерирует `outputPath = AppPaths.Recordings/recording-YYYYMMDD-HHmmss-{guid}.wav`, передаёт в `IAudioRecorder.StartAsync`; на Stop вызывает `recorder.StopAsync(ct)` → получает `path` → `importUseCase.ExecuteAsync([path], null, ct)`.
2. `backend/src/Mozgoslav.Infrastructure/Services/AVFoundationAudioRecorder.cs` — POST на Electron bridge `/_internal/record/start` и `/_internal/record/stop/{sessionId}`, ждёт JSON `{path, durationMs}` в ответ.
3. `frontend/electron/recording/RecordingBridge.ts` — проксит в `NativeHelperClient.stopFileCapture(sessionId)`, возвращает `{path}` из хелпера.
4. `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/AudioCaptureService.swift` — `startFileCapture` / `stopFileCapture`.

**Подозреваемые причины (приоритет проверки):**

- **(P1) Single-tap конфликт.** В `AudioCaptureService.swift:138` tap на inputNode ставится только если `!engine.isRunning`. Если до file-capture уже работает streaming (`start()` ставит tap с callback'ом `process:`), file-сессия НЕ получает аудио — `writeToFiles:` просто не вызывается. File будет создан (AVAudioFile при `forWriting:` создаёт пустой файл с header'ом), но пустой / почти пустой. Фикс: (a) использовать один tap, вызывающий оба callback'а, либо (b) гарантировать что file-capture и streaming взаимоисключающи (reject на backend).
- **(P2) Race при Stop.** `stopFileCapture` возвращает `outputPath` синхронно, но AVAudioFile закрывается через ARC при выходе из scope — возможен ранний возврат до фактического flush на диск. ImportRecordingUseCase сразу пытается читать файл → миссится. Фикс: явно обнулить ссылку на `AVAudioFile` (сбрасывает последний `write` и закрывает fd) перед `return (path, durationMs)`.
- **(P3) Permissions / sandbox.** Если `AppPaths.Recordings` указывает на путь, куда helper не может писать (sandbox container Electron vs host filesystem у backend'а) — файл создаётся в одном месте, читается в другом. Маловероятно, т.к. оба процесса должны жить в `~/Library/Application Support/Mozgoslav/recordings/`. Но стоит логировать оба пути вокруг handoff'а.
- **(P4) ImportRecordingUseCase молчит.** Если путь ОК, но файл пустой/битый — use-case может не создать `Recording` entity и не зажурналить warning. `/api/recordings/stop` вернёт `{path, recordings: []}` и UI ничего не увидит.

**Минимальный диагностический план (10-15 мин):**
1. Добавить логирование `outputPath` на каждом handoff'е (backend start, bridge, Swift startFile, Swift stopFile, backend stop, ImportRecordingUseCase).
2. Воспроизвести на Mac с просмотром логов.
3. Проверить `ls -la ~/Library/Application Support/Mozgoslav/recordings/` после Stop — есть ли файл, его размер.
4. Если файл есть но пустой — P1/P2. Если нет — P3 или ранняя ошибка в helper.

**Оценка фикса:** M, 2-4 часа включая Mac-валидацию. Если это P2 — фикс в 1 строку (обнулить `session.file`) + тест.

### T3 — Speaker-aware transcript formatting

Diarization уже пишет speaker-labelled сегменты в `Transcript.Segments`, но `MarkdownGenerator` рендерит plain text. Пользователь видит blob вместо «Alice: … / Bob: …».

Что делать:
- Расширить `TranscriptSegment` (уже value object) полем `SpeakerLabel?` (уже может быть там, проверить).
- Правка `MarkdownGenerator.Generate` — если хотя бы у одного сегмента есть speaker, группировать по speaker и рендерить «**Alice (00:03):**\n текст…\n\n**Bob (00:15):**\n …».
- В `frontend/src/features/Notes/NoteViewer` вывод тоже обновить — наш markdown уже передаётся, но styling для speaker-header стоит добавить.

**Оценка:** S, 2-3 часа backend + 1 час frontend.

## Quick wins — дёшево и сейчас

### D2 — Live audio level meters в Dashboard record state

Сейчас peak-meter только в DictationOverlay. Есть `RecordingBridge` с уже живым аудио-потоком; прокинуть RMS/peak события в UI через ту же SSE-шину.

**Оценка:** S, 2-3 часа.

### D3 — Hot-plug микрофонов

Реакция на `AVCaptureDeviceWasConnected/Disconnected` в Swift helper → re-probe capabilities → backend эмитит событие → UI показывает toast и даёт повторно нажать Start.

**Оценка:** M, пол-дня (плюс Mac-тест двух hot-plug сценариев).

### G2 — Sentence-transformer default вместо BagOfWords

`PythonSidecarEmbeddingService` уже есть. Сейчас дефолт — `BagOfWordsEmbeddingService`. Переключить: в `Program.cs` при наличии `Mozgoslav:PythonSidecar:BaseUrl` делать `sidecar` первым выбором, `BagOfWords` — только fallback при sidecar-outage (как сейчас уже работает, но надо проверить, что quality-бонус реально доезжает до production-config).

**Оценка:** S, 1 час + sanity-тест на реальном notes-корпусе.

### U1 — Sample-audio "try it" button в онбординге

На Welcome-шаге кнопка «попробовать на готовом сэмпле». Бандлить 30-секундный `sample.wav` в `frontend/build/` → кнопка копирует его в `AppPaths.Recordings` → триггерит import через обычный pipeline → онбординг продолжается на реальном ProcessedNote.

**Оценка:** S, 2-3 часа.

### U2 — CommandPalette custom-styling

Сейчас kbar в дефолтном look&feel. Применить design-tokens из `frontend/src/styles/theme.ts` — backdrop-blur, accent glow, typography, keyboard hints.

**Оценка:** S, 2 часа.

### F1 — `models/` + `domain/` dedup

Параллельные копии TS-типов в `frontend/src/models/` и `frontend/src/domain/` (ProcessedNote, ProcessingJob, Profile, Recording, Settings, Model). Выбрать один слой (предлагаю `domain/` — там больше value-объектов вроде `ActionItem`, `enums`), перепроставить импорты, удалить другой.

**Оценка:** S, 2-3 часа (рутинный refactor + прогон tsc + tests).

## Как работать с этим файлом

- Делаем пункт → удаляем отсюда. Краткое описание shipped версии попадёт в `README.md` / `CLAUDE.md`.
- Открыли новый блокер / появился reactive bug → добавляем сюда с секцией `Critical`.
- Пункт забуксовал / стал не приоритетен → переместить в `ADR-014-unrealized-backlog.md` в соответствующий раздел.
