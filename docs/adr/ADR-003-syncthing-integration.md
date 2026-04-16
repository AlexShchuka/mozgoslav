# ADR-003: Syncthing Integration for Phone ↔ Desktop Sync

- **Status:** Proposed — draft for review
- **Date:** 2026-04-16
- **Related:** ADR-002 (Global dictation)

## Context

У пользователя два устройства: macOS Mac mini (основное рабочее) и телефон. Задача — **прозрачно синхронизировать**:
- записи (`recordings/*.m4a|mp3|wav`) — часто запись делается с телефона в move'е,
- обработанные заметки (`notes/*.md` + frontmatter),
- весь Obsidian vault (second-brain).

Требования:
- **Privacy-first** (как и вся mozgoslav) — без облаков, без чужих серверов.
- **End-to-end encrypted** в транспорте.
- **Бесплатно** и open-source.
- Работает на macOS + Android/iOS.
- Не требует user-side сложного сетапа.

### Варианты
- **iCloud Drive** — простой, но не E2E (Apple видит данные), vendor lock-in.
- **Dropbox/Google Drive** — облако, не privacy-first.
- **Resilio Sync (BitTorrent Sync)** — closed-source, freemium.
- **Syncthing** — open-source, E2E (XChaCha20-Poly1305 для encrypted folders), TLS 1.3 между пирами, P2P (LAN предпочитается, relay fallback). **Выбрано.**

### Решения пользователя
- **Bundled** — syncthing-бинарник внутри mozgoslav.app (zero-setup).
- **Bi-directional** — все три папки (recordings / notes / vault) полная двусторонняя синхронизация.
- **Conflict resolution** — Syncthing default (`.sync-conflict-<timestamp>.<ext>`).
- **Pairing UX** — QR-code (mac генерит QR, телефон сканирует Syncthing-app'ом).

## Decision

### D1. Bundle `syncthing` binary в Electron-bandle

- Syncthing → single statically-linked Go binary, ~18 MB arm64.
- Скачиваем нужные архитектуры (`darwin-arm64`, `darwin-amd64`) через `electron-builder.yml` → `extraResources`:
  ```yaml
  extraResources:
    - from: "resources/syncthing-${os}-${arch}"
      to: "syncthing"
  ```
- Build-step в CI: скачивает latest stable release Syncthing (v1.x stable) + проверяет checksum из `sha256sums.txt.asc`.

### D2. Lifecycle — child process managed by Electron main

- При старте mozgoslav:
  - Читаем/генерируем config в `~/Library/Application Support/Mozgoslav/syncthing/config.xml` (отдельный от системного syncthing если пользователь уже им пользуется).
  - Запускаем `syncthing serve --no-browser --no-restart --home=<путь>`.
  - Сохраняем PID, мониторим stdout/stderr в Electron log.
  - При quit — graceful shutdown через `POST http://127.0.0.1:<port>/rest/system/shutdown`.
- Порт — рандомный локальный свободный (чтобы не конфликтовать с user-installed Syncthing). API-key — генерируем при первом запуске, храним в `settings.db`.

### D3. Управление через Syncthing REST API

- Использовать официальный Syncthing REST API:
  - `GET /rest/system/status` — healthcheck.
  - `GET /rest/system/config` + `PUT` — управление folders/devices.
  - `POST /rest/cluster/pending/devices` — акцепт нового устройства.
  - `GET /rest/db/status?folder=<id>` — прогресс sync'а.
  - SSE `/rest/events` — live-обновления (folder-completion, device-connected, file-conflict).
- Обёртка в C# backend — `ISyncthingClient` интерфейс в `Mozgoslav.Application.Interfaces/`, реализация `SyncthingHttpClient` в `Infrastructure/Services/`.

### D4. Три synced folder'а с разной политикой

| Folder ID | Путь на маке | Политика | Versioning |
|---|---|---|---|
| `mozgoslav-recordings` | `~/Library/Application Support/Mozgoslav/data/recordings/` | **sendReceive** (bi-dir), простой ignore `*.partial` | `staggered` (24 версии, 30 дней) |
| `mozgoslav-notes` | `~/Library/Application Support/Mozgoslav/data/notes/` | **sendReceive** | `trashcan` (30 дней) — заметки обычно не хочется safe-delete |
| `mozgoslav-obsidian-vault` | путь из `settings.obsidianVaultPath` | **sendReceive** | `trashcan` (14 дней) |

Conflict resolution — **Syncthing default**: при одновременной правке одного файла на двух устройствах — сохраняется оба как `file.sync-conflict-YYYYMMDD-HHMMSS-<device>.<ext>`. Пользователь разрешает вручную.

### D5. Pairing UX — QR-code на мак-стороне

Flow:
1. В Settings mozgoslav → **Device Pairing** → кнопка `Show pairing QR`.
2. Модальное окно с QR-кодом, содержащим:
   ```
   mozgoslav://sync-pair?deviceId=<40-char>&folderId=mozgoslav-recordings,mozgoslav-notes,mozgoslav-obsidian-vault&apiKey=<token>&host=<LAN-hostname>
   ```
3. Под QR — текст: `"Установи Syncthing-Fork (Android) или Möbius Sync (iOS), отсканируй QR."`
4. Telephone-side: QR сканируется, Syncthing-app на телефоне добавляет device + auto-accept folders.
5. На маке в SSE `/rest/events` приходит `PendingDevicesChanged` → mozgoslav показывает toast `New device requesting connection: <name>. [Accept]`.

### D6. Folder path conventions

- Создание папок при первом запуске: `DatabaseInitializer` расширяется до `DataDirectoryInitializer` — создаёт 3 базовых папки + `.stignore` файл внутри каждой с default-паттернами (`.DS_Store`, `*.partial`, `*.tmp`).
- Obsidian vault path — опционально, пустой путь = vault не синкается.

### D7. Security posture

- **LAN discovery:** enabled (для быстрого первого коннекта).
- **Global discovery:** enabled по дефолту (использует `discovery.syncthing.net`, не видит контент, только advertising).
- **Relay:** enabled (на случай если оба устройства за NAT).
- **NAT traversal:** UPnP enabled.
- **TLS 1.3** между пирами — default Syncthing.
- Encrypted folders (передача через третью (untrusted) ноду encrypted) — **не используем** в первом MVP. Все наши peer'ы trusted.
- `X-API-Key` header для всех REST вызовов, ключ в `settings.db`.

### D8. UI — без новых Settings-экранов, минимальная точка входа для pairing

Полная фича реализуется целиком. UI добавляем **только там, где без него синк физически невозможен**:

- **Menu bar tray** (существующий Tray от диктовки, добавляем пункт меню) — `Show pairing QR…` открывает модальное окно с QR. Реиспользуем существующие Electron `dialog`/`BrowserWindow`-паттерны.
- **Conflict-файлы (`.sync-conflict-*`)** — НЕ отображаем в UI, разрешаются вручную через Finder. Документируем в `docs/sync-conflicts.md`.
- **Sync status** — доступен через `GET /api/sync/status` endpoint (для curl/дебага + будущего UI).

Полноценная Sync-секция в Settings (paired devices list, conflict view, advanced toggles) — отдельный ADR, когда понадобится UI.

Дефолты хардкодим:
- LAN + global discovery + relay: **enabled**.
- UPnP: **enabled**.
- 3 folder'а создаются автоматически с defaults из D4.
- API-key и device ID генерируются при первом запуске, хранятся в `settings.db` + `syncthing/config.xml`.

## Consequences

### Положительные
- Zero-setup для пользователя на маке — mozgoslav → install → works.
- E2E + P2P — данные не видят даже «транзитные» серверы Syncthing.org.
- Bundle Syncthing один раз, апдейтим вместе с mozgoslav релизами.
- Пользовательский syncthing (если стоит отдельно) не конфликтует — свой конфиг, свой порт.

### Отрицательные / риски
- **iOS-клиент платный** — Möbius Sync $19.99 (или free "synctrain" с iOS 16+). Пользователь должен купить/установить. Не наша проблема, но описать в docs.
- +18 MB к размеру Electron-bandle на каждую arch.
- Syncthing license = MPL-2.0 — совместима с MIT у mozgoslav, но при distribution надо включить LICENSE копию. Добавить в `.archive/licenses/SYNCTHING-LICENSE` (или `THIRD_PARTY_LICENSES.md`).
- Conflict resolution — manual. Для пользователя, который не привык — сюрприз. UI conflict-view обязателен.
- Первый sync больших vault'ов (>1 GB) может идти часами по мобильной сети. В UI показываем progress чётко.

### Out of scope (deferred)
- Web UI Syncthing (дефолтный на :8384) — не открываем; только наш UI.
- Encrypted folders — V2 если появятся untrusted ноды.
- Selective sync (part of vault только) — V2.
- Peer-to-peer файл-shares между юзерами — NO (privacy, не наша модель).

## Alternatives considered

**A1. iCloud Drive.** Отвергнуто: не E2E, vendor lock-in, лимиты.

**A2. Self-hosted Nextcloud + WebDAV.** Отвергнуто: требует сервер у пользователя, overhead.

**A3. Syncthing user-installed вместо bundled.** Отвергнуто: "удобно" для пользователя — это bundled.

**A4. Custom protocol через WebRTC.** Отвергнуто: изобретение велосипеда, Syncthing уже решил problem properly.

**A5. Send-only с маленького телефона.** Отвергнуто: пользователь явно выбрал bi-directional.

## Design discipline

Требования к реализации (проверяется при review):

- **SRP:** `SyncthingLifecycleService` — только child process. `SyncthingHttpClient` — только HTTP. `SyncthingConfigService` — только генерация config.xml. `SyncthingFolderInitializer` — только файловая иерархия. Не смешивать.
- **OCP:** `ISyncthingClient` интерфейс, http-реализация одна сейчас. Если в будущем добавится CLI-based fallback — новый класс без правки.
- **DIP:** `Mozgoslav.Application.Interfaces/ISyncthingClient` — порт; `Infrastructure/Services/SyncthingHttpClient` — реализация; `Api/Program.cs` — композиция.
- **KISS:** не строим абстракции для «возможного будущего» — нет generic `IPairingProtocol`, просто `SyncthingPairingService` с QR-генератором. Если появится iCloud fallback — добавим, не спекулируем.
- **Reuse:** `IHostedService` паттерн — как в существующем `QueueBackgroundService`. Typed HttpClient через `IHttpClientFactory` — как в существующих `Mozgoslav.Infrastructure/Services` (изучить паттерн). `DatabaseInitializer` — extend'им для создания sync-папок, не создаём новый инициализатор.
- **DRY без фанатизма:** REST-wrapper код общий (один `SyncthingHttpClient`), endpoint-specific методы — отдельные. Не городим сверху generic `ISyncthingResource<T>`.
- **Тесты — per-responsibility:** config generation / http client / lifecycle / folder init — каждый с отдельным test-classом.

## Implementation plan (full scope, reusing existing code)

**Принцип: максимум переиспользования текущих точек, без MVP-сокращений, без новых Settings-экранов.**

1. **BDD**: `sync.feature` — полный набор сценариев: fresh install → QR → phone pairing → folder appears → file roundtrip → edit on both sides → conflict file generated → user resolves manually.

2. **Backend — под-namespace Infrastructure/Services/ + Api/Endpoints/** (не новый проект в solution — избегаем разрастания):
   - `ISyncthingClient` в `Mozgoslav.Application.Interfaces/`.
   - `SyncthingHttpClient` (typed HttpClient через `IHttpClientFactory`) в `Mozgoslav.Infrastructure.Services/`.
   - `SyncthingLifecycleService` (`IHostedService`) — запуск/остановка child process. Реиспользует паттерн **существующего** `QueueBackgroundService` (`backend/src/Mozgoslav.Api/BackgroundServices/`).
   - `SyncthingConfigService` — генерация начального config.xml.
   - `SyncthingFolderInitializer` — создаёт 3 папки + `.stignore` при первом запуске. Extend'им **существующий** `DatabaseInitializer` (`backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs`) или делаем отдельный `IHostedService` с зависимостью от него.
   - Sync-секция в `AppSettingsDto` (`backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs` уже расширён Dictation-агентом — добавляем свои поля там же) + парсеры в `EfAppSettings` (`backend/src/Mozgoslav.Infrastructure/Services/EfAppSettings.cs` — паттерн расширения keys, как Dictation сделал с 12 своими полями).
   - `SyncEndpoints.cs` в `backend/src/Mozgoslav.Api/Endpoints/` с `GET /api/sync/status`, `GET /api/sync/pairing-qr`, `POST /api/sync/accept-device`. Pattern — как существующие `DictationEndpoints.cs`.

3. **Electron main** — модуль `frontend/electron/syncthing/` (feature-folder, как `frontend/electron/dictation/` который уже создан):
   - `SpawnSyncthing.ts` — child_process.spawn с управлением PID. Graceful shutdown через REST `/rest/system/shutdown`.
   - `TrayIntegration.ts` — добавляет пункт `Show pairing QR…` в **существующий `TrayManager`** из `frontend/electron/dictation/TrayManager.ts`. НЕ создавать новый Tray.
   - Прокидывает stdout/stderr в существующий Serilog log через backend API.

4. **Frontend** — минимум:
   - Новая feature `frontend/src/features/SyncPairing/` (SyncPairingModal.tsx + .style.ts + index.ts, как стандартный feature-паттерн проекта).
   - Реиспользуем **существующий** `frontend/src/components/Modal/Modal.tsx`.
   - `qrcode` npm dependency.
   - Локализация через `frontend/src/locales/ru.json` + `en.json` (как Dictation делал).
   - **НЕ добавляем:** Settings → Sync секцию, paired devices list, conflict-view (отдельный ADR).

5. **Build** (electron-builder):
   - Скрипт `scripts/download-syncthing.sh` — скачивает latest stable Syncthing release для `darwin-arm64` + `darwin-amd64`, verify GPG signature.
   - `electron-builder.yml` — `extraResources` с syncthing binary.
   - CI step вызывает скрипт перед `electron-builder build`.

6. **Tests** — в существующую структуру:
   - Unit (`Mozgoslav.Tests`): `SyncthingHttpClient` через WireMock, `SyncthingConfigService` генерация, `SyncthingFolderInitializer` — creates + idempotent.
   - Integration (`Mozgoslav.Tests.Integration`): реальный syncthing в контейнере (Testcontainers с `syncthing/syncthing:latest` image), наследуем от существующего `IntegrationTestsBase`. Проверяем: health, создание folder'а, добавление device через REST.

7. **License compliance**: добавить `THIRD_PARTY_LICENSES.md` с копией MPL-2.0 Syncthing license. Включить в Electron-bandle resources.

## References
- [Syncthing docs — REST API](https://docs.syncthing.net/dev/rest.html)
- [Syncthing docs — device pairing flow](https://docs.syncthing.net/users/guide-adding-a-device.html)
- [Syncthing — MPL 2.0 license](https://github.com/syncthing/syncthing/blob/main/LICENSE)
- [Syncthing-Fork (Android)](https://github.com/Catfriend1/syncthing-android)
- [Möbius Sync (iOS) — proprietary $19.99](https://mobiussync.com/)
- [synctrain (iOS, free, open source)](https://github.com/pixelspark/sushitrain)
- [Syncthing Community Forum — Electron integration examples](https://forum.syncthing.net/t/electron-for-cross-platform-native-apps/10845)
- [Shipping executables with Electron (extraResources pattern)](https://shivekkhurana.medium.com/shipping-executables-with-your-electron-app-c20bab239bfb)
