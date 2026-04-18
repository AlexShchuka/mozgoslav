# NEXT — активная очередь работы

- **Status:** Active queue. Пункт проверили → удалили из файла.
- **Date:** 2026-04-18
- **Scope:** acceptance-чеклист для Mac-валидации ветки `shuka/next-queue-2026-04-18` перед merge в `main`. Sandbox-тесты зелёные (backend 208 unit + 158 integration, frontend 144); ниже — то, что нужно глазами на реальном Mac.
- **Prev snapshots (shipped):**
  - `.archive/docs/backlog-try-ready-to-prod-2026-04-18.md` — D1/D2/D3/D4/F1/G2/T3/U1/U2 + U3 в ADR-014
  - `.archive/docs/backlog-hotkey-ui-and-home-merge-2026-04-18.md` — H1 (push-to-talk) + L1 (Home merge)

## UNVERIFIED ON MAC — критично проверить перед мёрджем

### V1 — Dictation: файл записи доезжает до приложения (D1 fix)

Агент починил P1 single-tap конфликт (mutually-exclusive с explicit error) и P2 AVAudioFile flush (явный `session.file = nil` до возврата). Добавил structured logging на всех handoff'ах.

**Как проверить:**
1. `cd frontend && npm run dev`.
2. Дашборд → Record → говори 5 секунд → Stop.
3. Запись **должна** появиться в «Recent recordings».
4. Если нет — открой `~/Library/Logs/Mozgoslav/helper-YYYYMMDD.log` и `~/Library/Application Support/Mozgoslav/logs/mozgoslav-*.log`, ищи `D1 handoff` — должна быть цепочка с непрерывным outputPath и ненулевым size. Пустой файл → WARN в ImportRecordingUseCase.

### V2 — Hot-plug микрофонов (D3 fix)

Swift `DeviceWatcher` подписан на `AVCaptureDevice.wasConnectedNotification` / `wasDisconnectedNotification`. Backend ретранслирует на SSE `/api/devices/stream`, Dashboard показывает toast.

**Как проверить:** подключи/отключи Bluetooth-наушники во время активной сессии записи — должен прилететь toast, кнопка Start должна стать активной. Snapshot-кадр при старте приложения подавляется, чтобы не спамить.

### V3 — Push-to-talk (H1) [UNVERIFIED ON MAC, main risk]

Swift `HotkeyMonitor` слушает `NSEvent.addGlobalMonitorForEvents(.keyDown/.keyUp)` для Electron-стильного accelerator. Dashboard подписан на SSE `/api/hotkey/stream`: press → startRecording, release → stopRecording.

**Prereq:** Settings → Диктовка → задай хоткей + включи чекбокс «Удерживать для записи». Перезапусти приложение (в main.ts bootstrap-путь читает настройку; hot-reload без restart — future work).

**Как проверить:**
1. Открой System Settings → Privacy & Security → **Accessibility** → убедись, что Mozgoslav добавлен.
2. Фокус любое приложение (Notes, Chrome).
3. Удерживай заданный хоткей — должна появиться overlay/запись.
4. Отпусти — запись останавливается, текст инжектится в фокусное приложение.
5. Если ничего не происходит — проверь `~/Library/Logs/Mozgoslav/helper-YYYYMMDD.log`, ищи `H1 HotkeyMonitor started` при старте и `press`/`release` события при нажатии.

Fallback: если выключишь «Удерживать для записи», должен сработать старый toggle через `globalShortcut` (keydown-only).

### V4 — Custom hotkey persists (#10)

Settings → Диктовка → запиши комбинацию через HotkeyRecorder → Save → **перезапусти приложение**. После restart main.ts polls `/api/settings` и регистрирует custom accelerator вместо дефолтного `⌘+Shift+Space`.

**Как проверить:** поменяй на `⌘+⌥+M`, restart, убедись что `⌘+Shift+Space` больше не реагирует а `⌘+⌥+M` — да. Hot-reload без restart тоже в будущем.

## Санити после чистой установки

### V5 — Обновление с legacy-БД

Если у тебя БД создана ещё через `EnsureCreated` (до ADR-011) — новый `Migrate()` упадёт с `table "processed_notes" already exists`. Это уже случалось сегодня. Решение: `rm ~/Library/Application\ Support/Mozgoslav/mozgoslav.db` перед первым запуском фикса.

### V6 — Онбординг-модели (#12b)

Delete local `mozgoslav.db` → запусти бек+фронт. Онбординг должен показать новый шаг `models` с двумя Tier-1 bundled entries (Whisper Small, Silero VAD). Если модели не в `BundleModelsDir` — кнопка «Скачать всё» последовательно тянет их с SSE-прогрессом. Когда все `installed=true` — toolbar Next разблокируется как «Продолжить».

### V7 — Default paths

После первого запуска (V5) проверь:
- `WhisperModelPath` = путь на bundled `ggml-small-q8_0.bin` (а не на antony66 `ggml-model-q8_0.bin`, как было раньше).
- `VaultPath` = `~/Documents/Obsidian Vault` **только если папка существует**, иначе пусто.

### V8 — Dashboard + Queue = Home (L1)

Sidebar — один пункт «Мозгослав» (иконка Sparkles), роут `/`. Внутри страницы: record controls сверху, live queue снизу. `/queue` редиректит на `/`. Заголовок "Мозгослав" больше не дублируется в sidebar header (там только иконка).

### V9 — Models progress (#13)

Settings → Модели → жми Скачать на антон-модели → под ряду появится progress-bar с bytes/total через SSE `/api/models/download/stream`. По завершении строка подсвечивается `Установлено`.

### V10 — Duration (#18 + #19)

После V5 импортни любой wav через drag-n-drop. В Recent Recordings должна сразу отобразиться реальная длительность (ffprobe). Если ffprobe не в PATH → показывается `—`, не `0:00`.

### V11 — Queue status локализация (#17)

Запусти любой job. В Queue статусы должны быть «В очереди» / «Транскрибация» / «Готово» / «Ошибка» / «Отменено» — не `queue.status.6` как было раньше (JobStatus теперь сериализуется строкой).

### V12 — Onboarding Skip + always-show (#14 + #15)

Онбординг сейчас показывается **на каждом запуске** (TEMP dev-override #15). Skip-кнопка работает правильно — переводит на `/`. После ревёрта #15 онбординг будет только при первом запуске.

## Как работать с этим файлом

- Проверили пункт → удалили отсюда.
- Не сработало → пиши в комменты ветки / новый bug, фиксим инкрементом.
- Когда список пуст → ветку можно мёрджить в main.
- Новые задачи (не acceptance) — обычным порядком: Critical / Quick wins.

## Known future work (отложено, не acceptance для текущей ветки)

- **H1 hot-reload:** смена хоткея в Settings применяется только после restart. Live re-register — в следующей итерации (нужен IPC-канал Settings save → main → orchestrator.stopKeyboardHotkey + startKeyboardHotkey).
- **#15 revert:** после того как онбординг стабилизируется (шагов больше не добавляем, баги протестированы) — вернуть `OnboardingCompleteGuard` к localStorage-проверке.
