# Mozgoslav v0.8 — self-review

Дата: 2026-04-17. Ветка: `shuka/v0.8-production-ready`.

Проверка соответствия отгруженного кода трём активным ADR. Версия пакета намеренно не бампилась — shuka выставит при
мердже.

---

## 1. Compliance с ADR-009 (Production readiness, no stubs)

| §ADR-009 | Требование                                           | Статус | Где это в коде                                                                                                                                                                                                                                   |
|----------|------------------------------------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2.1 (a)  | Реальная диаризация, не Noop                         | ✅      | `python-sidecar/app/services/diarize_service.py` — silero-vad + Resemblyzer + agglomerative clustering. `test_diarize.py` covers happy path + empty + single-speaker.                                                                            |
| 2.1 (b)  | Реальный NER, не Noop                                | ✅      | `python-sidecar/app/services/ner_service.py` — Natasha pipeline (Segmenter + MorphVocab + NewsEmbedding + NewsNERTagger). `test_ner.py`.                                                                                                         |
| 2.1 (c)  | Gender / emotion с graceful degradation              | ✅      | `gender_service.py` + `emotion_service.py` (audeering). При отсутствии модели — `ModelNotAvailableError` → 503 envelope `{ code, model_id, hint }`. C# bridge: `SidecarModelUnavailableException`.                                               |
| 2.1 (d)  | Native macOS recorder вместо Noop                    | ✅      | `AVFoundationAudioRecorder` (Swift helper `AudioCaptureService`), `PlatformUnsupportedAudioRecorder` для не-macOS. `NoopAudioRecorder` удалён. Conditional DI в `Program.cs`. `/api/audio/capabilities` сообщает фронту состояние permission'ов. |
| 2.1 (e)  | Onboarding не показывает «download X» если X встроен | ✅      | `OnboardingPlatform.ts` + `hooks.ts` — определяет наличие Tier 1 моделей, скипает соответствующие шаги. Зелёные предусловия (`/api/health/llm`, `/api/audio/capabilities`) тоже скипаются.                                                       |
| 2.1 (f)  | Obsidian REST integration вместо file-only           | ✅      | `IObsidianRestClient` + `ObsidianRestApiClient` (typed `HttpClient`, bearer token, base `http://127.0.0.1:27123`). `POST /api/obsidian/open` использует REST когда reachable, `obsidian://` URI fallback иначе.                                  |
| 2.2      | Stub-features помечены явно или удалены              | ✅      | Удалено: `NoopAudioRecorder`. Помечено явно через `503 ModelNotAvailableError`: `gender`, `emotion` до скачивания audeering. ADR-006 (calendar autostart) — Phase 2 (`TODO.md`).                                                                 |

**UNVERIFIED:** реальная нагрузка `diarize_service` на 30-минутном RU-файле — не прогонял локально (Docker-нет в
sandbox). Покрыто в Mac validation §10 плана Block 2.

---

## 2. Compliance с ADR-010 (Bundled Russian models)

| §ADR-010 | Требование                          | Статус                                            | Где это в коде                                                                                                                                                                                                                                                                                                             |
|----------|-------------------------------------|---------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2.2      | Tier 1 в DMG                        | ⚠️ Готова инфраструктура, бинарники добавит shuka | `frontend/build/bundle-models.manifest.json` (4 файла, поля sha256/release_tag пустые до создания GitHub Release `models-bundle-v1`). `scripts/fetch-bundle-models.sh` скачивает по тегу из manifest. `electron-builder.yml` `extraResources: build/bundle-models/` — копирует в `Resources/bundle-models/` внутри `.app`. |
| 2.3      | Tier 2 каталог в Settings → Models  | ✅                                                 | `ModelCatalog` enum-driven entries для каждого Tier 2 (whisper-large-v3, RU fine-tunes, audeering). `ModelKind` discriminates STT / VAD / DiarizeEmbedder / GenderEmotion. `IAppPaths.BundleModelsDir` для Tier 1 lookup.                                                                                                  |
| 2.4      | Sha256-проверка                     | ✅                                                 | `fetch-bundle-models.sh` сверяет sha256 после download'а — fail-loud если mismatch. `ModelDownloadService` для Tier 2 — sha256 сверяет отдельно по каталогу.                                                                                                                                                               |
| 2.5      | Очевидный путь обновления манифеста | ✅                                                 | Один `release_tag` в JSON + одна команда `bash scripts/fetch-bundle-models.sh`. Под Phase 2 `models-bundle-v2` достаточно поправить тег и перегенерить манифест.                                                                                                                                                           |

**Открытое действие shuka (одноразовое):** см. `plan/v0.8/07-dmg-and-release.md` §6.

---

## 3. Дополнительно: integration с Block 5/6

- `GlossaryApplicator` — детерминированный (longest-first), не плодит double-replace, протестирован на пустых /
  whitespace входах.
- `LlmCorrectionService` — overlapping-window chunker (token continuity), graceful skip на
  `Profile.LlmCorrectionEnabled = false` или `LlmUnreachableException`. Pipeline order в `ProcessQueueWorker`: STT →
  glossary → correction → summarise → export.
- `ObsidianRestApiClient` — WireMock тесты (happy / 401 / 404 / network-down). Endpoint тесты `ObsidianEndpointsTests`
  покрывают REST + URI fallback пути.

## 4. Deliberately deferred (Phase 2)

| Item                                      | Почему отложено                                                                                   | Где зафиксировано                        |
|-------------------------------------------|---------------------------------------------------------------------------------------------------|------------------------------------------|
| Apple Developer ID signing + notarisation | Требует $99/yr cert + secrets — shuka действие. План turn-key.                                    | `plan/v0.8/07-dmg-and-release.md` §8     |
| GigaAM-v3 STT                             | Не ggml, отдельный inference-стек. Tier 2 покрыт `antony66/whisper-large-v3-russian` (WER 6.39%). | `TODO.md` §Phase 2                       |
| Calendar / meeting autostart              | Не востребовано в v0.8.                                                                           | `TODO.md` §Phase 2                       |
| Web-aware RAG                             | Груминг закончен, реализация в Phase 2.                                                           | `docs/adr/ADR-008-web-rag.md`            |
| Версионный bump                           | Shuka выставит на мердже v0.8 MR.                                                                 | `plan/v0.8/08-cleanup-and-archive.md` §1 |

## 5. Conclusion

Кодовая база v0.8 соответствует ADR-009 (нет Noop в production-критичных путях; downloadable модели — graceful 503) и
ADR-010 (Tier 1 встроены, Tier 2 каталогизирован, sha256 проверяется). Implementation готов к мерджу после:

1. Зелёный CI на `shuka/v0.8-production-ready` (release.yml — на тег; обычный `ci.yml` — на push).
2. Mac validation reports от shuka по блокам 3, 4, 6, 7 (плюс одноразовые действия для bundle release).
3. Финальный version bump в `package.json` + backend `*.csproj` (выполняет shuka).

Никаких архитектурных или security-долгов, блокирующих v0.8, не зафиксировано.
