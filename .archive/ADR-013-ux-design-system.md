# ADR-013 — UX design system

- **Status:** Proposed
- **Date:** 2026-04-17
- **Scope:** визуальный язык приложения — цвета, типографика, motion. Не про новые компоненты.

## Политика

Единый язык в стиле Logi Options+ 2026: глубокие чёрно-синие фоны, живой cyan/mint как единственный акцент,
motion-дизайн как подсказка действия (не декоратив). Один источник токенов — `frontend/src/styles/theme.ts`.

## Палитра

### Цвет-токены (dark — primary)

| Токен              | Hex                        | Назначение                               |
|--------------------|----------------------------|------------------------------------------|
| `bg`               | `#0c0c14`                  | Главный фон приложения                   |
| `bg.elevated1`     | `#121219`                  | Поднятые секции (sidebar fill)           |
| `bg.elevated2`     | `#1a1a24`                  | Карты, drawer                            |
| `bg.elevated3`     | `#22222e`                  | Modals, popovers                         |
| `border.subtle`    | `#22222e`                  | Разделители                              |
| `border.strong`    | `#3a3a4a`                  | Поля ввода в focus                       |
| `text.primary`     | `#ecedef`                  | Основной текст                           |
| `text.secondary`   | `#a5adc2`                  | Подписи, labels                          |
| `text.muted`       | `#6b7280`                  | Hints, placeholder                       |
| `accent.primary`   | `#29fcc3`                  | CTA, active state, progress fill         |
| `accent.secondary` | `#0bd4cd`                  | Secondary actions, gradient stop         |
| `accent.soft`      | `rgba(41, 252, 195, 0.12)` | Hover background, selected row           |
| `accent.contrast`  | `#0c0c14`                  | Text/icon inside `accent.primary` button |
| `accent.glow`      | `rgba(41, 252, 195, 0.35)` | Box-shadow glow на focus/active          |
| `success`          | `#29fcc3`                  | Тот же acc (mint уже читается как "ok")  |
| `warning`          | `#fbbf24`                  | Желтый warn                              |
| `error`            | `#f87171`                  | Ошибки                                   |
| `info`             | `#60a5fa`                  | Нейтральная подсветка                    |
| `focusRing`        | `rgba(41, 252, 195, 0.5)`  | Outline focus-visible                    |

### Градиент акцента

`linear-gradient(135deg, #29fcc3 0%, #0bd4cd 100%)` — для primary-кнопок, progress bar'ов, brand-badge.

### Light-тема

Инвертируем базовые слои, акцент оставляем тот же (брендоносный — не меняется с theme-switch).

| Токен             | Hex                                           |
|-------------------|-----------------------------------------------|
| `bg`              | `#f7f8fa`                                     |
| `bg.elevated1`    | `#ffffff`                                     |
| `text.primary`    | `#0c0c14`                                     |
| `accent.primary`  | `#0bd4cd` *(deeper cyan читается на светлом)* |
| `accent.contrast` | `#ffffff`                                     |

## Типографика

Уже ок в текущем theme — оставляем `sharedTypography`. Проверить только:

- `font.size.xs/sm/md/lg/xl/xxl` — ок.
- `font.weight.regular = 500` — базовый вес bold-ish на Retina, ок.

## Elevation

| Token           | Shadow                                                                    |
|-----------------|---------------------------------------------------------------------------|
| `shadow.xs`     | `0 1px 2px rgba(0, 0, 0, 0.4)`                                            |
| `shadow.sm`     | `0 4px 12px rgba(0, 0, 0, 0.4)`                                           |
| `shadow.md`     | `0 10px 28px rgba(0, 0, 0, 0.5)`                                          |
| `shadow.lg`     | `0 24px 56px rgba(0, 0, 0, 0.6)`                                          |
| `shadow.accent` | `0 0 0 1px rgba(41, 252, 195, 0.35), 0 8px 24px rgba(41, 252, 195, 0.18)` |

## Motion-токены

### Длительности

| Token                     | ms  | Применение                    |
|---------------------------|-----|-------------------------------|
| `motion.duration.instant` | 80  | Tap-feedback                  |
| `motion.duration.fast`    | 150 | Hover, small UI changes       |
| `motion.duration.base`    | 220 | Page transitions, card mount  |
| `motion.duration.slow`    | 360 | Onboarding-steps, modal enter |

### Easing

| Token                       | cubic-bezier                                                    | Применение             |
|-----------------------------|-----------------------------------------------------------------|------------------------|
| `motion.easing.standard`    | `(0.2, 0, 0, 1)`                                                | Default для всего      |
| `motion.easing.emphasized`  | `(0.3, 0, 0.1, 1)`                                              | Entry animations       |
| `motion.easing.spring.soft` | framer-motion `{ type: "spring", stiffness: 260, damping: 28 }` | Hover lift, card press |
| `motion.easing.spring.firm` | framer-motion `{ type: "spring", stiffness: 420, damping: 32 }` | Toggle, tap-release    |

## Паттерны motion

### Button

- Hover: `scale(1.02)` + `shadow.accent` glow. Spring soft.
- Active (press): `scale(0.98)` instant.
- Focus-visible: `outline: 2px solid focusRing`.
- Loading state: pulsing `accent.glow` 1200ms.

### Card

- Mount: opacity 0→1 + `translateY(8px)` → 0. Stagger 60ms между карточками.
- Hover: `translateY(-2px)` + `shadow.md` → `shadow.lg`. Spring soft.
- Click: scale 0.99 instant.

### Sidebar item

- Hover: фон `accent.soft`.
- Active: `accent.primary` left-bar 3px + bold label + icon tint `accent.primary`.
- Active transition: layoutId через framer-motion — glow-bar плавно скользит между items.

### ProgressBar

- Fill: gradient (accent.primary → accent.secondary).
- Animated shimmer moving left→right 2000ms infinite.
- On complete: brief glow pulse.

### Onboarding

- Step transitions: fade 150ms + slide `translateX(±20px)`.
- CTA button: glow-pulse если step-gate зелёный (auto-detected).
- "Ready" — confetti-подобная particle burst (легковесно, без canvas).

### Toasts

- Enter: spring firm from top-right, `translateX(+100%)` → 0.
- Auto-dismiss: fade 200ms.
- Stack: новые пушат старые вниз spring-анимацией.

### DictationOverlay

- Enter: scale 0.9 → 1, opacity 0 → 1, spring soft.
- Recording state: pulsing `accent.glow` around border.
- Background: `backdrop-filter: blur(20px)` — glass-morphism.

### Page transitions

- Route change: `AnimatePresence` в `App.tsx` — fade 120ms, translateY 6px.

## Файловая структура

- `styles/theme.ts` — токены (palette, typography, elevation, motion).
- `styles/motion.ts` (новый) — framer-motion variants экспорт (`buttonVariants`, `cardVariants`, `sidebarVariants`,
  etc).
- `styles/GlobalStyle.ts` — base html/body/focus-visible. Импортирует `accent.glow` для `::selection`.
- Компоненты потребляют только через `theme.*` — никаких hex-ов прямо в styled.

## Что удалить

- Purple-акцент `#7c3aed` / `#a78bfa` из `lightTheme`/`darkTheme` — прощаемся.
- Любые inline-стили без токенов — grep'нуть `color:\s*#` в `frontend/src/**/*.ts*` и заменить.

## Приоритет внедрения

1. Swap palette в `theme.ts` (30 мин).
2. Motion tokens + `styles/motion.ts` (1 час).
3. `Button`, `Card`, `ProgressBar` — motion variants (2 часа).
4. `Layout/Sidebar` — active indicator glow (1 час).
5. `Onboarding`, `Dashboard` — entry animations (2 часа).
6. `Toasts` (react-toastify override), `Modal`, `CommandPalette` (kbar styling) (1 час).
7. `DictationOverlay` — glass-morphism (30 мин).
8. Mac-валидация (твоё время, финальные правки).

## Не делаем в этой ADR

- Иконки (Lucide уже используется — ок).
- Анимированные иллюстрации для EmptyState (Phase 2).
- Per-feature темы (accent variation по разделам) — одна тема.
- Reduced-motion fallback — делаем одновременно с реализацией.
