# ADR-012 — Frontend conventions

- **Status:** Proposed
- **Date:** 2026-04-17
- **Scope:** `frontend/src/**`. Where our code drifts from standard feature-based React + Redux-Saga conventions, and what to fix.

## Политика

Фронт построен на feature-based архитектуре, Redux-Toolkit + Redux-Saga, styled-components. Где реализация отошла от mainstream React-Redux-Saga guidelines — фиксируем.

## Несоответствия

### 1. API-слой размазан
- **Эталон:** `api/ApiFactory.ts` + `api/BaseApi.ts` + per-domain `api/<Domain>Api.ts`. Все вызовы — через typed per-domain client.
- **У нас:** `ApiFactory.ts` + `BaseApi.ts` + `RecordingApi.ts` + `SettingsApi.ts` **AND** отдельный `MozgoslavApi.ts`-wrapper, которым пользуется большинство страниц напрямую (обходит per-domain client'ы).
- **Поправить:** убить `MozgoslavApi.ts`. Разложить методы по `<Domain>Api.ts` (Notes, Profile, Model, Obsidian, Dictation, Sync, Meta, Backup). Страницы зовут per-domain API, не общий wrapper.

### 2. Container + Presentational не применён
- **Эталон:** `Foo.tsx` (presentational, props-only) + `Foo.container.ts` (`connect(mapStateToProps, mapDispatchToProps)`).
- **У нас:** только `features/RecordingList` следует паттерну. Остальные features (Dashboard, Queue, Notes*, RagChat, Profiles, Models, Settings, Logs, Backups, Obsidian, Sync, Onboarding) — hook-based с прямыми API-вызовами.
- **Поправить:** завести `.container.ts` для write-path фичей (Profiles, Settings, Obsidian, Sync, Onboarding). Read-only pages (Logs, Notes viewer, DictationOverlay) — оставить hook-based как осознанный прагматизм для чисто-презентационных.

### 3. Store-slicing — только две фичи
- **Эталон:** Redux-store покрывает domain-state cross-cutting для всех write-path features. Feature-based или domain-based — допустимы, главное — покрытие.
- **У нас:** только `store/slices/recording` + `store/slices/rag`. Большая часть state живёт в локальных хуках `useState` + `fetch`, без middleware и без возможности разделить saga-логику.
- **Поправить:** завести slice'ы `profiles`, `models`, `settings`, `obsidian`, `sync`, `onboarding`. Shared UI state (theme, toasts, modals) — в отдельный `ui` slice.

### 4. Slice-структура неполная
- **Эталон:** каждый slice — `actionCreator.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`.
- **У нас:** `recording` slice — полный, `rag` — частичный.
- **Поправить:** при реализации новых slice'ов (п.3) — полная структура. Использовать `plopfile.js`-генератор (он уже есть).

### 5. Нет route-guards
- **Эталон:** `src/guards/*.tsx` — обёртки над `Route`, проверяют предусловия (auth, onboarding, feature-flag) перед рендером.
- **У нас:** Onboarding-gate (`localStorage.mozgoslav.onboardingComplete`) зашит внутри `Onboarding.tsx` + `App.tsx`. Нет `guards/` директории.
- **Поправить:** `guards/OnboardingCompleteGuard.tsx` — оборачивает protected routes. Даёт расширяемость (feature-flag guards, permission guards в будущем).

### 6. i18n без типизации
- **Эталон:** typed translation keys — IDE autocomplete, compile-time проверка на отсутствующие ключи.
- **У нас:** `i18next` + `react-i18next` + `locales/ru.json` / `en.json`. Ключи — строковые литералы, без type-safety.
- **Поправить:** сгенерить типы из JSON через `i18next-typescript-plugin` или аналог. Low priority — работает и без этого.

### 7. Нет testUtils / помощников для тестов
- **Эталон:** `src/testUtils/` с `renderWithStore`, `renderWithRouter`, `mockApi` factory. Тесты переиспользуют.
- **У нас:** каждый `__tests__/*.test.tsx` — свой setup, дублирование mock-логики.
- **Поправить:** `src/testUtils/renderWithStore.tsx` + `mockApi` helper. Сократит дубль и ускорит написание новых тестов.

### 8. Plop-templates не документированы в workflow
- **Эталон:** генерация features + slice через `npm run plop` — документированный шаг для новой фичи.
- **У нас:** `plopfile.js` существует, templates лежат в `plop-templates/`, но workflow не упоминается в `CONTRIBUTING.md`. Новые features написаны руками с дрейфом от эталонной структуры.
- **Поправить:** раздел «Новый feature» в `CONTRIBUTING.md` → `npm run plop`. Не переписывать plopfile — он корректный.

### 9. Возможный дубликат моделей
- **Эталон:** TS-типы доменных entity живут в одной директории — `models/` либо `domain/`.
- **У нас:** есть и `src/models/` и `src/domain/` (после рефакторинга). Возможен дубликат типов.
- **Поправить:** aудит — если одни и те же DTO определены в обоих местах, унифицировать.

### 10. Styling / theme — ок
- **Эталон:** styled-components + ThemeProvider + light/dark токены.
- **У нас:** `styles/theme.ts` + `ThemeProvider.tsx` + `GlobalStyle.ts` — ок.
- **Поправить:** расширение палитры и motion-токенов — отдельно в ADR-013.

## Приоритет внедрения

1. API-слой унификация (п.1) — критично для тест-поддержки и читаемости.
2. testUtils (п.7) — быстрый выигрыш сразу после п.1.
3. Container + Presentational + store-slicing (п.2, 3, 4) — под каждую write-path feature отдельный PR.
4. Guards + Models dedup (п.5, 9) — косметика, можно разом.
5. i18n typing (п.6) — низкий приоритет.
6. Plop workflow docs (п.8) — один коммит в `CONTRIBUTING.md`.
