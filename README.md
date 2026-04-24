# Mozgoslav

Локальный second brain. Аудио → очистка → транскрибация → коррекция → суммаризация →
structured markdown → Obsidian.

Desktop-приложение для macOS Apple Silicon. Всё локально, privacy-first. Ничего не уходит наружу, кроме запросов к
LLM-endpoint, который ты сам указал в настройках.

## Состав

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API — EF Core, Whisper.net, OpenAI SDK, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TypeScript + Redux-Saga + styled-components + i18n (ru/en)
├── python-sidecar/    FastAPI — реальные ML endpoints (diarize / NER) + downloadable (gender / emotion)
```

## Модели

Пути скачанных STT/VAD моделей: `~/Library/Application Support/Mozgoslav/models/`.

## Privacy & security

- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Preload whitelistит только
  `openAudioFiles / openFolder / openPath`.
- CSP: `default-src 'self'`, `connect-src 'self' http://localhost:5050 ws://localhost:5173 http://localhost:5173`.
  Никаких внешних адресов.
- Kestrel слушает **только** `localhost:5050`. CORS — localhost и `app://mozgoslav`.
- Все секреты (LLM API key, Obsidian token) живут в SQLite `settings`. Никогда не передаются никуда, кроме endpoint'а,
  куда явно адресованы.
- Zero telemetry. Никаких crash-reporters / analytics / auto-update checks.
- Логи — только локально в `~/Library/Application Support/Mozgoslav/logs/`. Просматривать прямо в UI (Logs page).
- Downloads моделей — только HuggingFace HTTPS URL из встроенного каталога (`ModelCatalog.cs`) либо релиз
  `models-bundle-v1` (sha256-checked).

## Бэкапы

UI → **Backups → Create**, или `POST /api/backup/create`. Складывается zip в
`~/Library/Application Support/Mozgoslav/backups/` (база + конфиг, без логов). Восстановить — распаковать в ту же папку.

## Разработка

См. [CONTRIBUTING.md](CONTRIBUTING.md)

## Лицензия

MIT — см. [LICENSE](LICENSE).
