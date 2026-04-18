# Backlog — Cancelled items (snapshot 2026-04-18)

Сюда уходят пункты, которые сознательно сняты с бэклога по итогам разбора `docs/adr/ADR-014-unrealized-backlog.md`. Это исторический след: видно ЧТО и ПОЧЕМУ мы решили не делать. Обновлять и дополнять этот файл не нужно — он фиксирует состояние на указанную дату.

## R1 — Apple Developer ID signing + notarization

**Было:** планировали подписать DMG Apple Dev ID + нотаризовать, чтобы Gatekeeper не пугал юзера на первом запуске.

**Статус:** не делаем вообще.

**Почему:** решение owner'а (shuka) — не брать $99/год подписку и сопровождающие обязательства.

## C1 — Calendar autostart

**Было:** исторический ADR-006, идея — подписаться на macOS Calendar через EventKit, авто-запускать запись когда встреча начинается.

**Статус:** не делаем.

**Почему:** owner — «пока не надо». Phase-1 (ручной старт записи) покрывает use-case. Если появится внешний запрос — разморозим с отдельным ADR.

## L1 — Light-mode visual review

**Было:** `theme.ts` содержит light-палитру, но глазами полный pass по всем экранам в light-режиме ни разу не делали.

**Статус:** не делаем.

**Почему:** UX всё равно будет переделываться в следующей итерации дизайна. Полировка текущего light-mode — sunk cost перед переработкой.

## M2 — Multipart audio upload вариант endpoint'ов

**Было:** sidecar'овые endpoint'ы сейчас принимают `{audio_path: "..."}` — single-machine assumption. Если sidecar контейнеризуется и теряет доступ к host-FS, нужен multipart upload (bytes через body).

**Статус:** не делаем.

**Почему:** owner-decision — контейнеризацию sidecar на desktop не делаем. Product positioning (local-first, macOS-first, bundled DMG, privacy zero-network) не совместим с требованием Docker Desktop у юзера. Если когда-нибудь появится cloud-sidecar — это будет отдельное ADR, и multipart добавится там.
