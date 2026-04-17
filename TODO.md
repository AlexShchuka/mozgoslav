# mozgoslav — active TODO

Обновлено 2026-04-17. v0.8 «production-ready» приземлена. Версия в `package.json` / `*.csproj` намеренно не бампилась — shuka выставит при мердже MR.

## Shipped in v0.8

- ✅ **Real ML в python-sidecar (ADR-009)** — `diarize` (silero-vad + Resemblyzer + agglomerative clustering), `ner` (Natasha), `gender` / `emotion` (audeering, downloadable, `503 ModelNotAvailableError` envelope до скачивания). `ml/loader.py`, `ml/model_paths.py`, schemas. C# `IPythonSidecarClient` + `PythonSidecarClient` + `SidecarModelUnavailableException`.
- ✅ **Bundled Russian models (ADR-010)** — Tier 1: `whisper-small-q5_0.bin`, `ggml-silero-v6.2.0.bin`, `silero_vad.onnx`, `resemblyzer-state.pt` живут внутри DMG (`Resources/bundle-models/`). `ModelCatalog` Tier 1/Tier 2 + `ModelKind` + `IAppPaths.BundleModelsDir`.
- ✅ **macOS native mic recorder** — `AVFoundationAudioRecorder` (Swift helper `AudioCaptureService`), `PlatformUnsupportedAudioRecorder` для не-macOS. `NoopAudioRecorder` удалён. `/api/audio/capabilities`, `/api/recordings/{start,stop}`, Electron `RecordingBridge`, `PermissionProbe.swift`.
- ✅ **Slim onboarding** — Welcome → Try-now → LLM (auto-detect) → Obsidian (auto-detect) → Mic permission → Dictation → Ready. Скипает зелёные предусловия силами `/api/health/llm` + `/api/audio/capabilities`. ru/en i18n.
- ✅ **Glossary + LLM correction** — `GlossaryApplicator` (longest-first deterministic apply), `LlmCorrectionService` (overlapping-window chunker), миграция `0013`, `Profile.LlmCorrectionEnabled`. Интегрировано в `ProcessQueueWorker`.
- ✅ **Obsidian REST API** — `IObsidianRestClient` + `ObsidianRestApiClient` (typed HttpClient, bearer token), endpoints `POST /api/obsidian/open` + `GET /api/obsidian/rest-health`. Fallback на `obsidian://` URI когда плагин недоступен.
- ✅ **DMG release pipeline** — `.github/workflows/release.yml` (macos-latest runner, on tag `v*.*.*`), `scripts/fetch-bundle-models.sh`, `scripts/build-icon.sh`, `electron-builder.yml` обновлён (extraResources, icon path), `frontend/build/bundle-models.manifest.json`. `GET /api/meta` для DMG sanity-check.
- ✅ **CI green** — `ModelDownloadService` progress fix, `DictationPushWebmOpus` routing fix.
- ✅ **Repo cleanup** — старые ADR-007 family → `docs/adr/.archive-v2/`; root reports → `.archive/reports/`; `CONTRIBUTING.md` отделён от `README.md`.

## Phase 2 — отложено осознанно

- **Apple Developer ID signing + notarisation.** План — `plan/v0.8/07-dmg-and-release.md` §8 (turn-key: env-vars, entitlements, `electron-notarize`, `afterSign` хук).
- **GigaAM-v3 STT** — SOTA по русскому, не ggml; требует отдельный inference-стек. Не блокирует v0.8 (Tier 2 включает `antony66/whisper-large-v3-russian` WER 6.39%).
- **Calendar / meeting autostart** (исторический ADR-006). Не востребовано в v0.8.
- **Web-aware RAG** — `docs/adr/ADR-008-web-rag.md` (груминг готов, BC-каталог + риски приватности зафиксированы).
- **shuka one-time действия для DMG релиза** (`plan/v0.8/07-dmg-and-release.md` §6):
  1. Создать GitHub Release `models-bundle-v1` и приложить Tier 1 файлы.
  2. Заполнить `release_tag` + sha256 в `frontend/build/bundle-models.manifest.json`.
  3. Положить 1024×1024 PNG в `frontend/build/icon-source.png`, прогнать `bash scripts/build-icon.sh`.
  4. Прогнать `cd frontend && npm ci && npm run dist:mac` на Mac, валидировать DMG end-to-end.
- **Mac validation reports блоков 3, 4, 6, 7** — shuka на Mac проходит чек-листы из `plan/v0.8/0X-*.md` §«Mac validation checklist» и кладёт `.archive/reports/v0.8/blockX-mac-validation-2026-04-YY.md`.

## Architecture debt (минорный)

- `IIdleResourceCache<T>` экспонирует оба `GetAsync` и `AcquireAsync/ReleaseAsync` — историческая совместимость со старыми тестами. Следующий рефакторинг может свернуть API к одному паттерну.
- Migration `0010_syncthing_settings` — marker-only (schema лёг из EF-конвенции). Если будет нужен explicit history row — авторизуем полноценно.
- No migration row auto-written for `llm_provider`; первая `SaveAsync` сеет. Fresh DB boots → fallback `openai_compatible`.

## Out-of-scope (повторяем для ясности)

- Linux/Windows DMG-аналоги — Mozgoslav macOS-first, см. `CLAUDE.md` §«Out of scope».
- Auto-update (Sparkle / electron-updater) — `CLAUDE.md` privacy: «No auto-update checks».
- Multi-language transcription beyond RU/EN.
- Dark-mode визуальная полировка.
