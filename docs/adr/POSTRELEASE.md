# POSTRELEASE — задачи post-v1.0

- **Status:** Deferred. Включаем в работу только после выхода v1.0.
- **Date:** 2026-04-18
- **Scope:** release-engineering + distribution задачи, которые сознательно отложены за горизонт первого релиза. Не трогаем до v1.0 ни обсуждениями, ни кодом.

## R2 — DMG auto-update (Sparkle / electron-updater)

**Зачем:** юзер обновляется вручную скачиванием нового DMG. Для production-роллаута нужна авто-доставка версий.

**Что делать:**
- Выбор движка: Sparkle (нативный macOS, Apple-flavour) или `electron-updater` (cross-framework). Рекомендую Sparkle — один раз настроенный, работает без сетевых хуков от Electron main-process.
- Хостинг appcast.xml + DMG у нас же на GitHub Releases (привязать workflow).
- Отдельное ADR, потому что это ломает privacy-манифест CLAUDE.md «No auto-update checks, zero network checks» — надо эксплицитно договориться о compromise (opt-in auto-check? приватный HTTPS endpoint? signed feed?).

**Почему после v1.0:** в v0.8 zero-network — продукт позиционируется как локальный. Менять политику до того как v1.0 выйдет — нет смысла.

**Оценка:** M, 2-3 дня (новое ADR + Sparkle integration + GitHub Actions appcast publisher + signing cert).

## R3 — Linux / Windows build targets

**Зачем:** сейчас macOS-first. Часть юзеров сидит на Linux / Windows; хотят попробовать.

**Что делать:**
- **Audio recorder:** AVFoundation замена. На Linux — ALSA / PulseAudio / PipeWire wrapper. На Windows — WASAPI / MediaFoundation. Архитектура уже готова: `IAudioRecorder` — port, реализации свопаются. `PlatformUnsupportedAudioRecorder` сейчас honestly gates feature; на новых платформах — написать реальные.
- **Swift helper vs альтернативы:** Swift package не переносим. На Linux/Windows либо (а) отдельный нативный хелпер на C/Rust, либо (б) прямое API внутри .NET (NAudio для Windows). Гло́бал-hotkey — то же, другая платформа, другой API.
- **ffmpeg:** уже есть на всех трёх — оставим `CliWrap`, только сменить bundling (сейчас DMG тянет macOS-бинарь; на других сборках — свои binaries или системный PATH).
- **Python sidecar:** и так cross-platform (CPython + `uvicorn`). На Linux/Windows только bundling и wheel resolution менять.
- **Electron packaging:** `electron-builder.yml` уже поддерживает `mac/linux/win`; добавить `linux: { target: ["AppImage", "deb"] }` и `win: { target: ["nsis"] }` после того как рекордер готов.

**Почему после v1.0:** приоритизируем macOS-experience. Cross-platform — история для растущей аудитории.

**Оценка:** L, 2-3 недели на все три платформы (рекордер — самая сложная часть).

## Как работать с этим файлом

- До v1.0 — файл read-only, не добавляем, не трогаем. Только если кто-то приносит production-релиз-задачу — фиксируем здесь с меткой «post-v1.0».
- После v1.0 — брать в работу по порядку (R2 → R3 или параллельно, решить на planning-сессии).
- Сделали пункт → удалить, описать shipped-состояние в `README.md` / `CLAUDE.md`.
