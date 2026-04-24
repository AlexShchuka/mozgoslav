# TODO Frontend — Hand-off report

**Date:** 2026-04-17
**Scope:** TODO.md V2-roadmap items TODO-1 (frontend half), TODO-4, TODO-5, TODO-6
**Outcome:** All four acceptance commands green; 97 tests pass (up from 81 baseline); bundle ships.

---

## Final acceptance (all run from `frontend/`)

| Command             | Result                              |
|---------------------|-------------------------------------|
| `npm run typecheck` | PASS (0 errors)                     |
| `npm run lint`      | PASS (0 errors, 0 warnings)         |
| `npm test`          | **97 passed, 0 failed** (19 suites) |
| `npm run build`     | Bundled successfully                |

`frontend/.env` contains `WATCHPACK_POLLING=true` (unchanged).

---

## Per-item status

| Item                   | Title                     | Status                                                                                                                                                                                                                                            |
|------------------------|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| TODO-4                 | Profile CRUD UI           | **PASS** — full CRUD wired (create / read / update / delete / duplicate); built-in guard enforced; empty-name validation                                                                                                                          |
| TODO-5                 | Command palette (Cmd+K)   | **PASS** — kbar integrated at App-root; 15 actions (11 nav + 4 quick); renderer wire-up verified by tests                                                                                                                                         |
| TODO-6                 | Onboarding wizard         | **PASS** — restructured to 9 steps per ADR-007 D15; welcome animation verified; finish writes localStorage flag                                                                                                                                   |
| TODO-1 (frontend half) | Global dictation shortcut | **PARTIAL** — Electron main-process hook, preload bridge, renderer subscription, and unit tests are in. The macOS-native round-trip (`globalShortcut` fires while another app has focus) must be validated on the user's Mac — flagged UNVERIFIED |

---

## TODO-4 — Profile CRUD UI

### Files modified

- `frontend/src/api/MozgoslavApi.ts` — added `deleteProfile(id)` + `duplicateProfile(id)`.
- `frontend/src/features/Profiles/Profiles.tsx` — row actions (Edit / Duplicate / Delete); confirm dialog; built-in
  disable; toast pipeline for success/error.
- `frontend/src/features/Profiles/ProfileEditor.tsx` — testids; client-side name validation; transcriptionPromptOverride
  now round-trips (was hard-coded to `""` before).
- `frontend/src/features/Profiles/ProfileEditor.style.ts` — `FieldError` styled component.
- `frontend/src/locales/{ru,en}.json` — duplicate / deleteConfirm / builtInDeleteBlocked / duplicated / deleted /
  nameRequired.

### Files added

- `frontend/src/features/Profiles/__tests__/Profiles.test.tsx` — 7 red-first tests, all green.

### Tests added

| Path                | Test                                               |
|---------------------|----------------------------------------------------|
| `Profiles.test.tsx` | `Profiles_List_RendersWithBadges`                  |
| `Profiles.test.tsx` | `Profiles_Create_OpensEditor_PostsAndInserts`      |
| `Profiles.test.tsx` | `Profiles_Edit_OpensEditor_PutsAndRefreshes`       |
| `Profiles.test.tsx` | `Profiles_Duplicate_PostsAndInserts`               |
| `Profiles.test.tsx` | `Profiles_Delete_UserCreated_RemovesRow`           |
| `Profiles.test.tsx` | `Profiles_Delete_BuiltIn_ShowsErrorToast_RowStays` |
| `Profiles.test.tsx` | `ProfileEditor_SubmitEmptyName_ShowsValidation`    |

### Endpoint coverage

- `GET /api/profiles` ✓ (list)
- `GET /api/profiles/{id}` — not separately invoked; row carries the full Profile
- `POST /api/profiles` ✓ (create)
- `PUT /api/profiles/{id}` ✓ (update)
- `DELETE /api/profiles/{id}` ✓ (delete — user-created only; built-in disabled)
- `POST /api/profiles/{id}/duplicate` ✓ (duplicate)

---

## TODO-5 — Command palette (Cmd+K) with kbar

### Files modified

- `frontend/src/App.tsx` — `KBarProvider` wraps the main-app shell; `useCommandPaletteActions()` registers actions one
  level deeper so navigation + toasts can fire through react-router + react-toastify.
- `frontend/src/features/CommandPalette/CommandPalette.tsx` — rewritten using `KBarPortal` / `KBarPositioner` /
  `KBarAnimator` / `KBarSearch` / `KBarResults` + `useMatches`. Previous `react-hotkeys-hook` + custom virtualization
  dropped (kbar owns all of that).
- `frontend/src/features/CommandPalette/index.ts` — re-exports the new hook.
- `frontend/src/locales/{ru,en}.json` — `commandPalette.sections.*` + `commandPalette.actions.*`.
- `frontend/jest.setup.ts` — polyfills `Element.prototype.animate`, `ResizeObserver`, `requestAnimationFrame` (needed by
  kbar under jsdom).

### Files added

- `frontend/src/features/CommandPalette/useCommandPaletteActions.ts` — 15 kbar actions (Dashboard, Queue, Notes,
  RagChat, Profiles, Obsidian, Sync, Models, Settings, Logs, Backups + New note, Reindex RAG, Create backup, Open
  Obsidian vault).
- `frontend/src/features/CommandPalette/__tests__/CommandPalette.test.tsx` — 3 red-first tests, all green.

### Tests added

| Path                      | Test                                                      |
|---------------------------|-----------------------------------------------------------|
| `CommandPalette.test.tsx` | `CommandPalette_CtrlK_OpensOverlay`                       |
| `CommandPalette.test.tsx` | `CommandPalette_NavigationAction_RoutesToPath`            |
| `CommandPalette.test.tsx` | `CommandPalette_QuickAction_NewNote_DispatchesNoteCreate` |

### UX

- Default accelerator is kbar's built-in `$mod+k` (Cmd+K on macOS / Ctrl+K on Win/Linux).
- Typing narrows by `name` + `keywords`. Sections render as headers (Navigation / Quick actions).
- "Open Obsidian vault" reads `vaultPath` from settings; toasts a tip when the vault path is missing or the native
  bridge isn't available (browser mode).

---

## TODO-6 — Onboarding wizard (9-step)

### Files modified

- `frontend/src/features/Onboarding/Onboarding.tsx` — rewritten around named step keys (`welcome`, `models`, `obsidian`,
  `llm`, `syncthing`, `mic`, `accessibility`, `inputMonitoring`, `ready`); brand motion is gated on
  `current.key === "welcome"`; finishing the last step persists `mozgoslav.onboardingComplete=true` to `localStorage`;
  `AnimatePresence` dropped inside the Card to make jsdom test timing deterministic (step div is keyed by `step` index
  and enters without an exit phase).
- `frontend/src/locales/{ru,en}.json` — new `welcome.*`, `syncthing.*`; old `step1..step8` keys renamed to semantic
  names (`models`, `obsidian`, `llm`, `mic`, `accessibility`, `inputMonitoring`, `ready`).
- `frontend/src/features/Onboarding/Onboarding.style.ts` — unchanged API, already had `BrandMark` + `SkipButton`.
- `frontend/__tests__/Onboarding.test.tsx` — walked-forward counts updated (5 clicks to mic, 6 to AX, 7 to
  input-monitoring, 8 to ready); permission-button testids now use stable suffixes `mic` / `ax` / `input` instead of
  numeric `step5/6/7`.

### Tests added

| Path                  | Test                                                                                      |
|-----------------------|-------------------------------------------------------------------------------------------|
| `Onboarding.test.tsx` | `Onboarding_Welcome_BrandAnimation_EntryFires`                                            |
| `Onboarding.test.tsx` | `Onboarding_Finish_WritesOnboardingComplete`                                              |
| `Onboarding.test.tsx` | existing `Onboarding_Llm_NextDisabled_UntilHealthGreen` retained (adjusted for new index) |
| `Onboarding.test.tsx` | existing `Onboarding_Models_NextDisabled_UntilFileOrDownload` retained                    |
| `Onboarding.test.tsx` | existing `Onboarding_Skip_Grey_60PercentOpacity` retained                                 |
| `Onboarding.test.tsx` | existing `Onboarding_Skip_Hidden_OnMacPermissionSteps` retained                           |

### Gating matrix (ADR-007 §D15)

| Step                                  | Gate                                                            |
|---------------------------------------|-----------------------------------------------------------------|
| welcome                               | —                                                               |
| models                                | `api.listModels().some(m => m.installed)` OR `downloadComplete` |
| obsidian                              | —                                                               |
| llm                                   | `api.llmHealth() === true` (polled every 3 s)                   |
| syncthing                             | — (no backend health probe yet — follow-up)                     |
| mic / accessibility / inputMonitoring | Skip hidden — permissions not optional                          |
| ready                                 | —                                                               |

---

## TODO-1 (frontend half) — Global dictation shortcut

### Files modified

- `frontend/electron/main.ts` — imports + registers `CommandOrControl+Shift+Space` on `app.whenReady`, unregisters on
  `app.on("will-quit")`.
- `frontend/electron/preload.ts` — exposes `window.mozgoslav.onGlobalHotkey(callback) → unsubscribe` via
  `contextBridge`; subscribes to the IPC channel `mozgoslav:global-hotkey-toggle`.
- `frontend/src/features/Dashboard/Dashboard.tsx` — `useEffect` subscribes to the bridge; on accelerator press starts a
  new dictation session with `source: "global-hotkey"` or stops the currently-recording one.

### Files added

- `frontend/electron/dictation/globalHotkey.ts` — `registerGlobalDictationHotkey()` /
  `unregisterGlobalDictationHotkey()` helpers + `GLOBAL_HOTKEY_ACCELERATOR` / `GLOBAL_HOTKEY_IPC_CHANNEL` constants.
  Split out from `main.ts` so ts-jest (CJS) can unit-test it without tripping over `import.meta.url`.
- `frontend/__tests__/electron/globalShortcut.test.ts` — 3 unit tests with `jest.mock("electron", …)`, all green.
- `docs/global-dictation-shortcut.md` — Mac prerequisites (Input Monitoring + Accessibility permissions), unit-test
  limitations, manual-test recipe, file map.

### Tests added

| Path                                        | Test                                                            |
|---------------------------------------------|-----------------------------------------------------------------|
| `__tests__/electron/globalShortcut.test.ts` | `Register_OnReady_BindsCmdShiftSpace`                           |
| `__tests__/electron/globalShortcut.test.ts` | `Unregister_OnQuit_ReleasesAll`                                 |
| `__tests__/electron/globalShortcut.test.ts` | `Toggle_EmitsIpcToRenderer`                                     |
| `Dashboard.test.tsx`                        | `Dashboard_GlobalHotkey_StartsDictation` (renderer integration) |

---

## Open items

1. **Backend coordination — `source: "global-hotkey"` value.** The renderer now posts
   `POST /api/dictation/start { source: "global-hotkey" }`. Backend agent's parallel TODO-1 work must accept this
   string. If the backend hasn't landed the `source` field yet, the backend will silently ignore it (the schema accepts
   extra fields) — no frontend change needed. Flag UNVERIFIED until the field is live.

2. **Syncthing step has no gate.** ADR-007 D15 doesn't prescribe a precondition for the Syncthing step (the backend
   starts Syncthing automatically via `SyncthingLifecycleService`). If product wants a gate (e.g. "Syncthing rest
   endpoint reachable"), surface via `GET /api/sync/health` and add a poll.

3. **Per-user hotkey rebinding.** Settings still contains `dictationKeyboardHotkey` but the main process hard-codes
   `CommandOrControl+Shift+Space`. A follow-up iteration can wire the setting to the `accelerator` argument of
   `registerGlobalDictationHotkey`.

4. **Command palette keyboard-shortcut hints.** Only `Settings` has a shortcut (`$mod+,`); other nav actions could carry
   the existing `mod+comma` style hints once Settings finalises its keyboard-shortcut surface.

---

## UNVERIFIED (validated on user's Mac)

- **Global accelerator fires while another app has focus.** jsdom can't simulate OS-level accelerators;
  `globalShortcut.register` behaviour under Apple Silicon + Input Monitoring permission must be confirmed by manually
  pressing `Cmd+Shift+Space` from Finder / VSCode.
- **Syncthing step visual polish.** No gate → Next is always unlocked; visual cue that Syncthing is running may need a
  subtle indicator on the user's Mac.
- **Welcome brand animation on the 300-450 ms mark.** Entry duration is set to 450 ms with `ease: "easeOut"` per ADR-007
  D15. Jest asserts the element presence; motion timing needs visual check.
- **Profile delete confirm dialog.** `window.confirm` in Electron uses the native modal; behaviour under macOS is
  UNVERIFIED (jest stubs it directly).
- **kbar styling and animations on macOS.** Basic integration tests pass under jsdom with shimmed animation APIs; the
  actual blur / scale / position polish should be eyeballed.
- **Electron global-shortcut registration on Apple Silicon with Gatekeeper.** Depending on codesign state the permission
  prompt might not surface until the user ships a signed `.app` bundle.

---

## Acceptance checklist

- [x] `npm --prefix frontend run typecheck` — green.
- [x] `npm --prefix frontend run lint` — green (0 errors, 0 warnings).
- [x] `npm --prefix frontend test` — green (97 tests, all existing + new pass).
- [x] `npm --prefix frontend run build` — bundles without error.
- [x] `frontend/.env` — `WATCHPACK_POLLING=true` retained.
- [x] No new npm packages installed (`kbar`, `framer-motion`, `lucide-react` all already present).
- [x] `todo-frontend-report.md` at repo root.
- [x] `docs/global-dictation-shortcut.md` created.
- [x] No git operations performed from this agent.
