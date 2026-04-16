# ADR-002: Global Push-to-Talk Dictation Shortcut (macOS)

- **Status:** Proposed — draft for review
- **Date:** 2026-04-16
- **Supersedes:** none
- **Related:** ADR-003 (Syncthing integration)

## Context

У пользователя регулярная задача — продиктовать текст в любое приложение (IDE, чат, email, заметки) вместо печати. Native macOS Dictation (Fn×2) плох: 
- качество для длинных фраз уступает on-device Whisper,
- нет LLM-полировки,
- нет кастомной лексики/словаря,
- не расширяемый.

Existing paid аналоги (SuperWhisper, Wispr Flow, Aqua Voice) решают задачу, но закрыты и/или отправляют голос в облако. У нас уже есть локальный Whisper.net через mozgoslav backend и локально-настраиваемый LLM — логично добавить **push-to-talk** режим как третий «рот» приложения (помимо recording import и background queue).

### Пользовательские решения (зафиксированы в сессии с shuka)
- Активация: **Push-to-Talk, 5-я кнопка мыши** (преднастраиваемая). Конфликты с системными биндами пользователь разрешает сам — Settings UI показывает help-link «Open System Preferences → Mouse» чтобы отключить.
- Фидбэк: **floating overlay + menu bar**. Overlay позиционируется **рядом с курсором** (Wispr Flow style).
- Язык: **ru фиксированный** (не auto-detect для скорости).
- Stop: **только отпускание кнопки**, без silence cutoff.
- STT режим: **streaming** (как Wispr Flow) — partial-text показывается в overlay пока говоришь.
- Text injection: **Accessibility API — посимвольный ввод** (не clipboard).
- LLM-полировка: **опция, выкл по дефолту**.
- **Audio playback не должен прерываться** при активации микрофона (у пользователя wired mic — BT-ограничения не актуальны, но оставляем non-exclusive mic access как общее требование).

## Decision

### D1. Active / inactive hotkey — через `uiohook-napi`, не `Electron.globalShortcut`

`Electron.globalShortcut` — **только клавиатура**, mouse buttons не поддерживает. Используем `uiohook-napi` (современный nAPI враппер libuiohook), который даёт:
- `mousedown` / `mouseup` с полем `button` (1=left, 2=right, 3=middle, 4=back, 5=forward, 6-9=дополнительные)
- keyboard fallback для пользователей без 5-кнопочной мыши
- Electron-совместим, node-gyp build

Регистрация: mouse button **5** (`forward`), перенастраиваемая в Settings (keyboard fallback: Right-Option по умолчанию). **Событие не consume'ится** — система получает mousedown(5) и, если у пользователя биндинг к forward-nav, он сработает параллельно. В Settings показываем help-link:
```
⚠ Mouse button 5 конфликтует с forward navigation? 
[Open System Preferences → Mouse] — отключи там.
```

### D2. Audio capture — max quality, non-exclusive

- Нативный Swift helper (компилируется как Electron native addon или helper-процесс через XPC):
  - `AVCaptureSession` с `AVCaptureDeviceInput` для выбранного микрофона.
  - **НЕ трогать output device**. `AVAudioSession` — это iOS API; на macOS output остаётся нетронутым, playback не прерывается (при условии non-BT mic).
  - **Capture: 48kHz mono 16-bit PCM** — native качество большинства USB/built-in микрофонов. Downsample до 16kHz для Whisper выполняем программно (`AVAudioConverter`) — НЕ отдаём Whisper'у лосси 16kHz прямиком с мика.
  - Почему 48 → 16: Whisper обучен на 16kHz, на 48 не даст преимуществ (всё равно downsample внутри). Но исходный 48kHz стрим помогает лучше работать VAD/noise-reduction, если они добавятся.
- Для Bluetooth-микрофонов HFP-режим неизбежен (ограничение протокола) — при выборе BT-микрофона Settings показывает warning «качество playback упадёт во время записи». Для built-in / wired (основной кейс shuka) проблемы нет.

### D2.1. Whisper model — используем только existing `ModelCatalog`

**НЕ добавляем новых моделей** — используем только то что уже в `backend/src/Mozgoslav.Api/Models/ModelCatalog.cs` (user preference).

- **Default для диктовки: `whisper-large-v3-russian-antony66`** — это уже `IsDefault: true` в каталоге. Russian fine-tune на Common Voice 17, WER 6.39% vs 9.84% у baseline. 1.6 GB. Best quality для русского (что и выбрал пользователь в языке).
- **VAD: `silero-vad`** — уже в каталоге как default для VAD. Используем для препроцесса streaming (пропускаем тишину перед Whisper, иначе галлюцинации).
- Если пользователь когда-нибудь вручную переключится в Settings — список модификаторов строго из того же `ModelCatalog.All`. Новые entries НЕ добавляем без отдельного ADR.
- Beam size: 5 (Whisper default). Temperature: 0 (детерминированно).

**НЕ добавляем в каталог:** `tiny`, `base`, `small`, `large-v1`, `large-v2`, `base.en`, `tiny.en` и прочие. Если пользователь захочет — отдельный тикет с обоснованием.

### D3. Streaming STT через Whisper.net (Wispr Flow style)

- Уже есть `WhisperNetTranscriptionService` в backend. Расширяем до **streaming**:
  - Микрофон пишет в кольцевой буфер 16kHz mono.
  - Воркер каждые ~500 мс берёт последние 2-3 с аудио **с overlap** и прогоняет через Whisper.net в режиме `Segmented` (короткий контекст) → получает partial transcript.
  - VAD-препроцесс (Silero VAD или простой energy-based) фильтрует тишину — иначе Whisper галлюцинирует.
  - Partial transcript публикуется через SSE `/api/dictation/stream` → overlay показывает живой текст.
  - Финал при `POST /api/dictation/stop` — ещё один полный проход на всём буфере, финальный текст заменяет partial в overlay и идёт на injection.
- Backend поднимается раз при старте mozgoslav (уже так), диктовка использует тот же процесс.
- **Риск latency:** Whisper.net на MacBook Pro M1/M2 даёт ~300-500 мс для 2-сек чанка (base модель), 500-800 мс для small. Acceptable для live partial. Если окажется медленно — fallback на batch (обработка только при release).

### D4. Text injection — гибрид `AXUIElement` → `CGEventPost`

macOS специфика (подтверждено по ресёрчу):
- Быстрый путь для большинства apps: `CGEventPost` с `kCGHIDEventTap` — 1-5 мс latency per character.
- **Electron-based apps (VS Code, Slack, Discord, Notion) swallow raw CGEvents** → для них fallback на `AXUIElement` через `AXSetValue(kAXValueAttribute)` — пишем в focused element напрямую.
- Стратегия: сначала пробуем получить focused app bundle id, если в blocklist (Electron-apps) — AXUIElement; иначе CGEventPost.

Реализация — native Swift helper, коммуницирует с Electron main через stdin/stdout JSON-RPC.

### D5. Permissions

Нужны при первом запуске:
- **Microphone** (TCC.db) — стандартный Electron prompt.
- **Accessibility** — для `CGEventPost` и `AXUIElement`. Нет API для programmatic request; Open System Preferences pane + onboarding-wizard показывает что сделать.
- **Input Monitoring** — для `uiohook-napi` mouse listener (если использует `CGEventTap` с `listenOnly`).

Flow: Onboarding-wizard при первом `globalShortcut.enabled = true` показывает 3 шага, открывает соответствующие pref-панели через `shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")`.

### D6. UI — floating overlay + menu bar

- **Menu bar app** (Electron `Tray`), иконка `mozgoslav.png`:
  - IDLE → серая.
  - RECORDING → красная + лёгкая pulse-анимация.
  - PROCESSING → жёлтая spinner.
- **Floating overlay** — новое `BrowserWindow` со свойствами:
  - `frame: false, transparent: true, alwaysOnTop: true, skipTaskbar: true, resizable: false, focusable: false` (чтобы не отбирать фокус у focused app).
  - Размер ~340×80.
  - **Позиция: рядом с курсором** (Wispr Flow style). При `mouseDown(5)` окно появляется в точке `(cursorX + 20, cursorY + 20)` с clamping к границам screen'a. При multi-display — на том же экране, где курсор.
  - Контент: audio-waveform визуализация (canvas) + partial transcript (live, обновляется по SSE), в правом углу spinner когда processing.
  - Появляется на mouseDown(5), исчезает на mouseUp(5) + 500ms fade.
- **Звуковой feedback** — минимальный: системный `Tink.aiff` на start, `Pop.aiff` на stop. Можно отключить в Settings.

### D7. Конфигурация — sensible defaults, без новых UI-экранов

Полная фича реализуется целиком — без MVP-сокращений. Defaults в коде + seed в `settings.db` при первом запуске (`DatabaseInitializer` расширяется). **Settings UI для этих опций пока НЕ добавляется** (user preference: не трогаем интерфейс). Значения правятся через прямую запись в `settings.db` или будущий Settings-экран (отдельная задача).

Значения по умолчанию (best quality / reasonable UX):
```json
{
  "dictation": {
    "enabled": true,
    "hotkey": { "type": "mouse", "button": 5 },
    "hotkeyKeyboard": "Right-Option",
    "language": "ru",
    "whisperModel": "large-v3-turbo",
    "captureSampleRate": 48000,
    "llmPolish": false,
    "llmPolishProfile": null,
    "injectMode": "auto",
    "overlayEnabled": true,
    "overlayPosition": "cursor",
    "soundFeedback": true
  }
}
```

Пользователь пока меняет их **только через прямое редактирование** `settings.db` или будущий CLI-хелпер. Полноценный UI — отдельная задача (`V2 roadmap`).

## Consequences

### Положительные
- Единственная установленная фича, которая повторит SuperWhisper/Wispr Flow локально и бесплатно.
- Переиспользует backend + Whisper.net — не дублируется pipeline.
- Overlay как отдельное `BrowserWindow` не блокирует main UI.

### Отрицательные / риски
- Нативный Swift helper требует macOS build окружения для сборки → CI macos-latest уже в плане, покрывает.
- AX permission не запросить программно → onboarding-wizard УДЛИНЯЕТСЯ (3 экрана permissions).
- `uiohook-napi` требует node-gyp + precompiled binaries для каждой arch (x64, arm64) → electron-builder `afterSign` hook.
- Streaming Whisper.net — не проверен на production latency, возможно придётся добавить VAD препроцесс (по примеру meetily) для снижения нагрузки.
- Диктовка в Electron apps (VSCode/Slack) идёт медленнее через AX, чем CGEvent — но всё ещё приемлемо (~10-30 мс/char).

### Out of scope (deferred)
- Hotkey на 5-ю кнопку — только macOS, Windows/Linux — keyboard only (для pet-проекта нормально).
- Auto-detection language — можно добавить как опцию позже; `ru` фиксирован по user preference.
- Silence cutoff — нет (user preference), если понадобится — как отдельная feature flag.
- Cloud backup diction history — NO (privacy-first).

## Alternatives considered

**A1. Clipboard paste vместо AX.** Отвергнуто: пользователь предпочёл AX; clipboard имеет риск затереть содержимое (можно save/restore, но adds complexity + flaky при быстром press-release).

**A2. Keyboard hotkey как default (Right-Option).** Отвергнуто как primary: mouse button 5 — user preference. Keyboard — fallback.

**A3. macOS native `NSAccessibilityPostKeyboardEvent`.** Отвергнуто: более низкий API, поведение хуже чем `CGEventPost` + `AXSetValue`. Используем стандартные пути.

**A4. Полностью native Swift app (как sebsto/wispr).** Отвергнуто: mozgoslav уже Electron + .NET; переписывать — неоправданно. Добавляем native Swift только helper.

**A5. Whisper.cpp subprocess вместо Whisper.net streaming.** Отвергнуто: у нас уже Whisper.net native, это текущий стандарт проекта. Streaming добавим в существующий сервис.

## Design discipline

Требования к реализации (проверяется при review):

- **SRP:** каждый класс — одна причина изменения. `DictationSessionManager` управляет state machine, `WhisperStreamer` — только Whisper API, `TextInjector` — только выбор AX vs CGEvent + отправка, `HotkeyMonitor` — только uiohook подписка. Не смешивать.
- **OCP:** `ITextInjector` — интерфейс, `AXTextInjector` и `CGEventTextInjector` — реализации. Добавление Windows-реализации в будущем = новый класс, без правки существующих.
- **LSP:** `IWhisperStreamer` реализации взаимозаменяемы. Модель меняется через конфиг, не через подтипы.
- **ISP:** `IHotkeyMonitor` не содержит методы для mouse-specific или keyboard-specific — один `IObservable<HotkeyEvent>`.
- **DIP:** все зависимости через interfaces в `Mozgoslav.Application.Interfaces/`. `Infrastructure` реализует, `Api` композирует в `Program.cs`.
- **KISS:** нет over-engineering. Прямо-forward state machine (5 состояний: Idle, Recording, Processing, Injecting, Error). Никаких Visitor / Chain-of-Responsibility там где 2 if'а справятся.
- **DRY без фанатизма:** аудио-буфер логика общая с существующим `ProcessQueueWorker` (если уместно). Но VAD-препроцесс — новый, т.к. ProcessQueue работает с полным файлом, streaming — с чанками.
- **Никакого dead code / speculative abstraction:** не добавляем интерфейс если реализация одна и обозримо не будет расширяться.

## Implementation plan (full scope, reusing existing code)

**Принцип: максимум переиспользования текущих точек кода, никаких новых Settings-экранов. Реализация полная — не MVP-урезание.**

1. **BDD**: `dictation.feature` — полный набор сценариев: hotkey start → overlay → partial → release → text inject → overlay fade. Error paths: permissions отказаны, Whisper модель не загружена, focused app в blocklist → AX fallback.

2. **Native Swift helper `MozgoslavDictationHelper`** (компилируемый в Electron bundle):
   - AXUIElement + CGEventPost hybrid injection.
   - AVCaptureSession 48kHz non-exclusive, downsample в 16kHz через AVAudioConverter.
   - JSON-RPC по stdin/stdout к Electron main.

3. **Electron main** — новый модуль `src/dictation/`:
   - `uiohook-napi` + mouseDown(5)/mouseUp(5) listener.
   - `Tray` (existing иконка app'a) — добавляем state (idle/recording/processing).
   - Overlay `BrowserWindow` (frame: false, transparent, alwaysOnTop, focusable: false) — реиспользуем существующий `createWindow` helper.
   - Стейт-машина диктовки (idle → recording → processing → injecting → idle).

4. **Backend (C# .NET) — новые endpoints + переиспользование существующих сервисов**:
   - `POST /api/dictation/start` — стартует сессию, возвращает `sessionId`.
   - SSE `GET /api/dictation/stream/{sessionId}` — partial transcripts (реиспользуем `ChannelJobProgressNotifier` подход).
   - `POST /api/dictation/stop/{sessionId}` — финал, возврат текста.
   - `Mozgoslav.Application`:
     - Новый `DictationSessionManager` — использует **существующий** `WhisperNetTranscriptionService` (расширить его `TranscribeStreamAsync` методом), **существующий** `CorrectionService` для опциональной LLM-полировки через `ILlmService`.
     - Использует **существующий** `ModelCatalog` — default model = `whisper-large-v3-russian-antony66` + VAD `silero-vad`, без новых entries.
   - `Mozgoslav.Infrastructure.Services.WhisperNetTranscriptionService` — extend для streaming: публичный `TranscribeStreamAsync(Stream, CancellationToken)` возвращает `IAsyncEnumerable<PartialTranscript>`.

5. **Settings UI** — **НЕ добавляем** нового экрана. Значения читаются из `settings.db` (seed при первом запуске через `DatabaseInitializer`). Будущее UI — отдельный ADR.

6. **Onboarding permissions** — переиспользуем существующий `Onboarding.tsx` компонент, добавляем 3 шага: Mic / Accessibility / Input Monitoring. НЕ создаём новый экран — это существующий flow.

7. **Tests** — в существующую структуру (`Mozgoslav.Tests` + `Mozgoslav.Tests.Integration`):
   - unit: injection strategy selection (Electron bundle id blocklist), DictationSessionManager state machine, VAD preprocessing.
   - integration (WebApplicationFactory): `/api/dictation/*` endpoints — happy + error.
   - e2e (macos-latest CI): 2-секундный silent WAV → pipeline возвращает empty partial без галлюцинаций.

## References
- [Electron globalShortcut — keyboard only, не mouse](https://www.electronjs.org/docs/latest/api/global-shortcut)
- [uiohook-napi — mouse + keyboard hook для Node.js](https://www.npmjs.com/package/uiohook-napi)
- [sebsto/wispr — open-source native macOS dictation (Swift, SwiftUI)](https://github.com/sebsto/wispr)
- [CGEventPost + Electron swallows events → AXSetValue workaround](https://developer.apple.com/forums/thread/103992)
- [node-mac-permissions — TCC checks](https://github.com/codebytere/node-mac-permissions)
- [SuperWhisper — offline push-to-talk reference](https://superwhisper.com/)
- [Wispr Flow — hold-to-talk flow reference](https://wisprflow.ai/)
