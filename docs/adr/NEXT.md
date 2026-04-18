# NEXT — активная очередь работы

- **Status:** Active queue. Пункт выполнили → удалили из файла.
- **Date:** 2026-04-18
- **Scope:** only что-то реализуем прямо сейчас или в ближайшей итерации. Backlog (то, что отложено) — `ADR-014-unrealized-backlog.md`. Post-v1.0 production — `POSTRELEASE.md`. Новые архитектурные решения — `ADR-016`, `ADR-017`.

## Critical — блокирует релиз / деградация основного флоу

## Quick wins — дёшево и сейчас

### D3 — Hot-plug микрофонов

Реакция на `AVCaptureDeviceWasConnected/Disconnected` в Swift helper → re-probe capabilities → backend эмитит событие → UI показывает toast и даёт повторно нажать Start.

**Оценка:** M, пол-дня (плюс Mac-тест двух hot-plug сценариев).

## Как работать с этим файлом

- Делаем пункт → удаляем отсюда. Краткое описание shipped версии попадёт в `README.md` / `CLAUDE.md`.
- Открыли новый блокер / появился reactive bug → добавляем сюда с секцией `Critical`.
- Пункт забуксовал / стал не приоритетен → переместить в `ADR-014-unrealized-backlog.md` в соответствующий раздел.
