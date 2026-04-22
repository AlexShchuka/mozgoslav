# Agent task — fix stale action-result feedback on tab remount

**Audience:** an implementation agent (developer role). Not a human ADR. Treat this file as a linear checklist: execute top-to-bottom, commit per phase, do not skip phases.

**Status:** authoritative. This file is the single source of truth for the fix. If you discover something that contradicts it, STOP and report — do not improvise.

---

## 0. Meta

**Owner:** rybalchenko
**Target branch:** `rybalchenko/fix-stale-action-feedback-2026-04-22` — created from `origin/main`.
**Commit mode:** commit per phase (phase numbers match commit subjects, see §Commit schema).
**No push. No MR.** Local commits only, unless the user instructs otherwise.
**Breaking changes are allowed** — Mozgoslav is pre-production, no external clients.
**Quality bar:** best-practice only. Refuse mediocre work. If a phase cannot meet the bar, stop and report — do not ship a compromise.
**No scope expansion.** Do not refactor unrelated code. Do not touch `.archive/`. Do not rewrite ADRs. Do not migrate other slices «while you're at it».
**2-strike rule:** if the same step fails twice, stop, capture the full context (error, files touched, commands run), report, wait. Do not silent-retry a third time.
**Autonomy:** do not ask clarifying questions back. If something is ambiguous, pick the best default consistent with this brief and flag it as UNVERIFIED in the phase report.
**Always read first.** Before writing any file, read the existing code it touches. Before creating any symbol, `grep` for duplicates.
**Commands:** every `dotnet` invocation MUST include `-maxcpucount:1` (sandbox CPU rule from root `CLAUDE.md`). Frontend commands run from `frontend/`.

---

## 1. Problem statement (what is being fixed)

Action results that should be one-shot events are stored as persistent fields in redux slices. Components read those fields through selectors and fire toasts inside `useEffect` hooks keyed by the field. When React Router unmounts the screen on tab switch and remounts on return, the selector still returns the same non-null value, the effect's dependency compare is identical, and the toast re-fires — as if the user just clicked the button.

### 1.1 Affected flows (source of the bug report)

| # | Component | Dispatched action | Persistent state field | `useEffect` location | Toast |
|---|---|---|---|---|---|
| 1 | `frontend/src/features/Settings/Settings.tsx` | `checkLlm()` | `settings.llmProbe.ok` | `Settings.tsx:50-57` | `"LLM: ✓"` / `"LLM: ✗"` |
| 2 | `frontend/src/features/Settings/Settings.tsx` | `loadSettings()` / `saveSettings()` failure paths | `settings.error` | `Settings.tsx:46-48` | `t("…error payload")` |
| 3 | `frontend/src/features/Obsidian/Obsidian.tsx` | `applyLayout()` | `obsidian.lastApplyLayoutReport` | `Obsidian.tsx:69-78` | `t("obsidian.applyLayoutSuccess", …)` |
| 4 | `frontend/src/features/Obsidian/Obsidian.tsx` | `bulkExport()` | `obsidian.lastBulkExportReport` | `Obsidian.tsx:63-67` | `t("obsidian.syncAllSuccess", …)` |
| 5 | `frontend/src/features/Obsidian/Obsidian.tsx` | `setupObsidian()` | `obsidian.lastSetupReport` | `Obsidian.tsx:80-86` | `t("obsidian.setupSuccess", …)` |
| 6 | `frontend/src/features/Obsidian/Obsidian.tsx` | any failure path | `obsidian.error` | `Obsidian.tsx:42-44` | `toast.error(error)` |

All six read from redux state whose lifetime is the session. None of them reset on component mount. Same root cause, same fix.

### 1.2 What is explicitly NOT in scope

- **`toast.success(t("settings.savedToast"))` at `Settings.tsx:64`** — fired from an event handler (`save()`), not from a selector-driven `useEffect`. Not stale. **Do not touch it.**
- Any other `toast.*` call in the codebase that is fired from an event handler (direct user click, form submit handler) — those are already one-shot and correct.
- Slices that already never emit toasts on SUCCESS (`sync`, `recording`, `profiles`, `jobs`, `rag`, `onboarding`). **Do not migrate them.** Scope creep is a defect.
- `.archive/` — never touch.
- Backend (.NET). No API changes.
- Electron main/preload. No changes.
- i18n resource files — unless you need to add a key for an error-translation helper (see §2.4). If you add one, add the key to **both** `src/locales/ru.json` and `src/locales/en.json`.
- Existing ADRs under `docs/adr/`.

---

## 2. Tech decisions (fixed — do not relitigate)

| Concern | Decision | Rationale |
|---|---|---|
| Primitive for user-facing one-shot events | **Transient notification actions.** A pair of redux action types per kind (`NOTIFY_SUCCESS`, `NOTIFY_ERROR`, `NOTIFY_WARNING`, `NOTIFY_INFO`), carrying `{ messageKey: string; params?: Record<string, unknown> }`. A single root-level saga converts them to `toast[kind](...)`. | Matches the canonical frontend pattern (cf. `frontend-scenarios-v2`'s effector `NotificationModel.add/remove/clear` used across all features). Event-like UI outputs emitted at the event, not observed from state. |
| Slice state for notifications | **None.** `react-toastify`'s `ToastContainer` already is the transient queue (`autoClose={3500}`, `newestOnTop`, position). Duplicating it in redux buys nothing. | Less state = fewer bugs. Keeps the slice purely action-and-saga. |
| Location | `frontend/src/store/slices/notifications/` — `actions.ts`, `saga/notificationsSaga.ts`, `index.ts`. No `reducer.ts`, no `mutations.ts`, no `selectors.ts`, no `types.ts`. | Consistent with team slice convention, but makes the slicelessness explicit. |
| Emission site | Only inside **sagas** (success and failure paths) and **event handlers** that have direct user context (e.g. validation errors before dispatch). NOT inside components' `useEffect`. | Drives the rule: components don't read a flag and fire a toast; sagas put a one-shot action. |
| Translation | Saga puts `messageKey` (string) + `params` (plain JSON). Listener saga calls `i18next.t(messageKey, params)` imperatively via the default `i18n` instance (already initialized in `frontend/src/i18n/index.ts`). | Sagas stay testable without a React tree. One coupling point between redux and i18next, inside `notificationsSaga.ts`. |
| Toast lib coupling | Isolated to `notificationsSaga.ts`. No other file in `frontend/src/store/` imports `react-toastify` after Phase 6. | Swap of toast lib later is a one-file change. Also helps saga tests — domain sagas never touch `toast`. |
| Error strings (fields like `settings.error` / `obsidian.error`) | Deleted from state. FAILURE sagas dispatch `notifyError({ messageKey, params })` with an appropriate key. If the error payload is a raw string from the backend (no key), use a generic key like `errors.genericErrorWithMessage` with a `{message}` param (add it to both locale files if missing — smallest possible addition). | Pattern-symmetric with success path. No hidden «error flash on remount». |
| Hardcoded strings in scope #1 | `"LLM: ✓"` / `"LLM: ✗"` are currently hardcoded. Replace with i18n keys `settings.llmCheckSuccessToast` / `settings.llmCheckFailureToast` — add to both `ru.json` and `en.json`. This is the ONE locale-file addition explicitly permitted. | We are deleting the call-site anyway; replacing two hardcoded strings with proper keys has zero extra cost and is a correctness improvement inside the same diff. |
| Typing of `messageKey` | `string` (not a template-literal union of known keys). `i18next.t` falls back to the key if missing, which is acceptable during migration. | Strong typing of translation keys is a separate concern; out of scope. |
| Tests | Every phase adds/updates saga tests using `redux-saga-test-plan` to assert: (a) the SUCCESS or FAILURE path `put`s the corresponding `notifySuccess` / `notifyError` action with the correct `messageKey` and `params`; (b) the SUCCESS path no longer `put`s a `SET_X_REPORT` action. One component test (React Testing Library) asserts no `useEffect`-driven toast remains in the migrated feature — i.e. mounting with pre-populated slice state does NOT call `toast.*`. | Locks the fix at the primitive level. |
| Code style | One class/module per file. `sealed`/`internal` — N/A (TS). No default export for utilities; default export for React components (team convention, root CLAUDE.md). | Existing convention. |
| No comments | Per project rule (`CLAUDE.md`: «NO COMMENTS!»). | Existing convention. |

Anything not in this table: pick the simplest thing that works and flag UNVERIFIED.

---

## 3. Pre-flight

```bash
cd /home/coder/workspace/mozgoslav-main
git fetch origin main
git checkout main
git reset --hard origin/main
git status                    # MUST be clean
git checkout -b rybalchenko/fix-stale-action-feedback-2026-04-22
```

Read (do not skip):

- Root `CLAUDE.md` (authoritative on conventions; `.archive/` invisible)
- `frontend/CLAUDE.md` (frontend conventions; slice layout)
- `frontend/src/store/rootSaga.ts` — you will add one `fork(watchNotificationsSagas)` line
- `frontend/src/i18n/index.ts` — confirm the imperative `i18n.t(key, params)` API you will use from the saga
- `frontend/src/main.tsx` — confirm `<ToastContainer/>` is mounted (do NOT modify its props)
- `frontend/src/store/slices/recording/` — the canonical slice reference (structure template); your new slice is smaller but follows naming
- Each source file you are migrating in its phase (listed per phase below)
- `frontend-scenarios-v2/src/models/notification/index.ts` + `src/shared/ui/NotificationStack/*` (cloned at `/home/coder/workspace/frontend-scenarios-v2/` if present) — reference implementation to keep in mind when reasoning about the target shape. You are NOT porting effector code; you are matching the primitive.

If any of those reads reveal a material deviation from this document (e.g. an additional `last*Report` field added after 2026-04-22, or a new `useEffect(..., [stateField])` pattern somewhere not listed in §1.1), STOP and report — do not silently extend scope.

---

## 4. Phase 0 — notifications slice scaffold

Commit subject: `feat(notifications): phase 0 — scaffold slice-less notifications saga`

### 4.1 New files

Create `frontend/src/store/slices/notifications/actions.ts`:

```ts
export const NOTIFY_SUCCESS = "notifications/NOTIFY_SUCCESS" as const;
export const NOTIFY_ERROR = "notifications/NOTIFY_ERROR" as const;
export const NOTIFY_WARNING = "notifications/NOTIFY_WARNING" as const;
export const NOTIFY_INFO = "notifications/NOTIFY_INFO" as const;

export interface NotifyPayload {
    readonly messageKey: string;
    readonly params?: Record<string, unknown>;
}

export const notifySuccess = (payload: NotifyPayload) =>
    ({type: NOTIFY_SUCCESS, payload} as const);
export const notifyError = (payload: NotifyPayload) =>
    ({type: NOTIFY_ERROR, payload} as const);
export const notifyWarning = (payload: NotifyPayload) =>
    ({type: NOTIFY_WARNING, payload} as const);
export const notifyInfo = (payload: NotifyPayload) =>
    ({type: NOTIFY_INFO, payload} as const);

export type NotificationAction =
    | ReturnType<typeof notifySuccess>
    | ReturnType<typeof notifyError>
    | ReturnType<typeof notifyWarning>
    | ReturnType<typeof notifyInfo>;
```

Create `frontend/src/store/slices/notifications/saga/notificationsSaga.ts`:

```ts
import {takeEvery} from "redux-saga/effects";
import {toast} from "react-toastify";
import i18n from "../../../../i18n";
import {
    NOTIFY_SUCCESS,
    NOTIFY_ERROR,
    NOTIFY_WARNING,
    NOTIFY_INFO,
    type NotificationAction,
} from "../actions";

function showToast(action: NotificationAction): void {
    const message = i18n.t(action.payload.messageKey, action.payload.params ?? {}) as string;
    switch (action.type) {
        case NOTIFY_SUCCESS:
            toast.success(message);
            return;
        case NOTIFY_ERROR:
            toast.error(message);
            return;
        case NOTIFY_WARNING:
            toast.warning(message);
            return;
        case NOTIFY_INFO:
            toast.info(message);
            return;
    }
}

export function* watchNotificationsSagas() {
    yield takeEvery(
        [NOTIFY_SUCCESS, NOTIFY_ERROR, NOTIFY_WARNING, NOTIFY_INFO],
        showToast,
    );
}
```

Create `frontend/src/store/slices/notifications/index.ts`:

```ts
export * from "./actions";
export {watchNotificationsSagas} from "./saga/notificationsSaga";
```

### 4.2 Root saga registration

In `frontend/src/store/rootSaga.ts` — add:

- One import: `import {watchNotificationsSagas} from "./slices/notifications";`
- One entry inside the `all([...])`: `fork(watchNotificationsSagas),`

Place the fork BEFORE any feature watcher that will `put(notify*)` (to avoid an undefined-ordering edge where a synchronous saga on boot could emit before the listener is attached). Top of the list is safe.

### 4.3 Tests

Add `frontend/src/store/slices/notifications/__tests__/notificationsSaga.test.ts`:

- Use `redux-saga-test-plan`'s `expectSaga`.
- Mock `react-toastify` (`jest.mock("react-toastify", () => ({toast: {success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn()}}))`).
- Mock `i18n.t` to return `${key}:${JSON.stringify(params)}`.
- One case per action type: dispatch the action, assert the corresponding `toast.*` was called with the translated string.

### 4.4 Verification

```bash
cd frontend
npm run typecheck
npm run lint
npm test -- notifications
```

Must be green.

**Phase 0 exit criteria:** the four actions exist and are typed; dispatching any of them from anywhere results in a single toast; tests green.

---

## 5. Phase 1 — migrate LLM connection check

Commit subject: `fix(settings): phase 1 — emit LLM check toast via notifications`

### 5.1 Read first

- `frontend/src/features/Settings/Settings.tsx`
- `frontend/src/store/slices/settings/saga/checkLlmSaga.ts`
- `frontend/src/store/slices/settings/actions.ts`
- `frontend/src/store/slices/settings/reducer.ts`
- `frontend/src/store/slices/settings/mutations.ts`
- `frontend/src/store/slices/settings/selectors.ts`
- `frontend/src/store/slices/settings/types.ts`
- `frontend/src/features/Settings/Settings.container.ts`

### 5.2 Locale additions

Add to **both** `src/locales/ru.json` and `src/locales/en.json` under the existing `settings` namespace:

- `settings.llmCheckSuccessToast` — ru: `"LLM: соединение установлено"`, en: `"LLM: connection OK"`.
- `settings.llmCheckFailureToast` — ru: `"LLM: соединение не установлено"`, en: `"LLM: connection failed"`.

(These replace the hardcoded `"LLM: ✓"` / `"LLM: ✗"`.)

### 5.3 Saga change

In `frontend/src/store/slices/settings/saga/checkLlmSaga.ts`:

- After determining `ok: boolean` from the API response, `yield put(ok ? notifySuccess({messageKey: "settings.llmCheckSuccessToast"}) : notifyWarning({messageKey: "settings.llmCheckFailureToast"}));`
- **Delete** the `yield put(checkLlmResult({ok}))` line AND the `CHECK_LLM_RESULT` action type AND the `settleLlmProbe` mutation AND the reducer branch handling `CHECK_LLM_RESULT` AND the `llmProbe.ok` field in `SettingsState` AND the `selectLlmProbe` selector AND the container mapping of `llmProbe` to props.

However — `llmProbe.probing` is still needed for the button's `isLoading` state. Keep it. Reduce `llmProbe` to `{probing: boolean}`:

- `types.ts`: `llmProbe: {probing: boolean}` (initial `{probing: false}`).
- `mutations.ts`: keep `markLlmProbing`; delete `settleLlmProbe`.
- Reducer: `CHECK_LLM` → `markLlmProbing`; new terminator `CHECK_LLM_DONE` (action type) — resets `probing: false`. Saga puts `CHECK_LLM_DONE` at the end of the flow (both success and error paths, in `finally`).
- `selectors.ts`: keep `selectLlmProbe` but narrowed; or introduce `selectLlmProbing` (boolean). Whichever is fewer LOC — prefer removing `selectLlmProbe` in favour of `selectLlmProbing`.

### 5.4 Component change

In `frontend/src/features/Settings/Settings.tsx`:

- Delete the entire `useEffect(() => { if (llmProbe.ok === null || llmProbe.probing) return; … }, [llmProbe]);` block at lines 50-57.
- Remove `llmProbe` from the destructured props; replace with `isLlmProbing` (boolean).
- Wire the button's disabled/spinner state to `isLlmProbing` (match the existing `isSaving` / `isLoading` pattern around it).
- Container `mapStateToProps`: replace `llmProbe: selectLlmProbe(state)` with `isLlmProbing: selectLlmProbing(state)`.

### 5.5 Tests

- Update `checkLlmSaga.test.ts` (or create if missing):
  - Success path: API returns `ok: true` → `put(notifySuccess({messageKey: "settings.llmCheckSuccessToast"}))` and `put({type: CHECK_LLM_DONE})`. Assert NO `CHECK_LLM_RESULT` put.
  - Failure path (API throws or `ok: false`): `put(notifyWarning({messageKey: "settings.llmCheckFailureToast"}))` + `CHECK_LLM_DONE`.
- Component-level test (Settings): render with `llmProbe: {probing: false}` in initial store (no `ok` field). Assert `toast.*` was not called. Previously this is exactly what re-fired on remount.

### 5.6 Verify and commit

```bash
cd frontend && npm run typecheck && npm run lint && npm test
git add -A && git diff --staged | head -120   # sanity-check the diff
git commit -m "fix(settings): phase 1 — emit LLM check toast via notifications"
```

**Phase 1 exit criteria:** clicking «Проверить соединение» still shows the success/failure toast once; switching tabs and returning to Settings does NOT re-fire the toast; tests green.

---

## 6. Phase 2 — migrate Settings error

Commit subject: `fix(settings): phase 2 — emit load/save errors via notifications`

### 6.1 Scope

- `LOAD_SETTINGS_FAILURE` — saga `frontend/src/store/slices/settings/saga/loadSettingsSaga.ts` (or equivalent).
- `SAVE_SETTINGS_FAILURE` — saga `frontend/src/store/slices/settings/saga/saveSettingsSaga.ts` (or equivalent).
- Component useEffect `Settings.tsx:46-48` (`if (error) toast.error(error);`).
- `settings.error` field.

### 6.2 Error message mapping

Add ONE key to both locale files (under a new or existing `errors` namespace — check what exists first; reuse if there is one):

- `errors.genericErrorWithMessage` — ru: `"Ошибка: {{message}}"`, en: `"Error: {{message}}"`.

### 6.3 Changes

- Both FAILURE sagas: `yield put(notifyError({messageKey: "errors.genericErrorWithMessage", params: {message: extractMessage(err)}}))`. Implement `extractMessage(err: unknown): string` inline (small helper; ≤ 6 lines). Do NOT add a package.
- Reducer: remove `error: typed.payload` from `LOAD_SETTINGS_FAILURE` / `SAVE_SETTINGS_FAILURE` branches. They still flip the `isLoading` / `isSaving` flags back to `false`, so `error: null` is no longer relevant — drop the `error` field entirely.
- `types.ts`: remove `error: string | null` from `SettingsState`.
- `selectors.ts`: remove `selectSettingsError` if it exists.
- Container: drop `error` prop.
- Component: delete `error` from destructured props; delete the useEffect at 46-48.

### 6.4 Tests

- Saga tests for both FAILURE paths — `put(notifyError({messageKey: "errors.genericErrorWithMessage", params: {message: …}}))`.
- Component test: mount Settings with initial error-free state; no `toast.error` called. Mount after a failure was dispatched (simulate via store) — still no `toast.error` on re-mount (the toast was fired at the saga level, not on state observation).

### 6.5 Verify and commit

Same as Phase 1.6.

**Phase 2 exit criteria:** load/save settings errors still appear as toasts once; no re-fire on tab switch; tests green.

---

## 7. Phase 3 — migrate Obsidian applyLayout

Commit subject: `fix(obsidian): phase 3 — emit applyLayout result via notifications`

### 7.1 Scope

- Saga: `frontend/src/store/slices/obsidian/saga/applyLayoutSaga.ts`.
- Component useEffect: `Obsidian.tsx:69-78`.
- State fields: `obsidian.lastApplyLayoutReport`.
- Actions: `APPLY_LAYOUT_SUCCESS` (the `put` is removed; the action type is deleted unless referenced by tests — check).

### 7.2 Changes

Saga:

```ts
// after the API call succeeds (report in scope):
yield put(notifySuccess({
    messageKey: "obsidian.applyLayoutSuccess",
    params: {folders: report.createdFolders, notes: report.movedNotes},
}));
```

And on failure (same saga's catch / failure path):

```ts
yield put(notifyError({
    messageKey: "errors.genericErrorWithMessage",
    params: {message: extractMessage(err)},
}));
```

Remove:

- `APPLY_LAYOUT_SUCCESS` action type + creator (if nothing else imports it).
- Reducer branch for `APPLY_LAYOUT_SUCCESS` setting `lastApplyLayoutReport`.
- `lastApplyLayoutReport` field in `ObsidianState.types.ts`.
- `selectLastApplyLayoutReport` in `selectors.ts`.
- `lastApplyLayoutReport` from container `mapStateToProps`.
- The useEffect at `Obsidian.tsx:69-78` and the `lastApplyLayoutReport` prop destructuring.

**Do NOT delete `obsidian.error` yet** — it is still populated by bulkExport and setupObsidian failures. It is deleted in Phase 6.
**Do NOT delete `isApplyingLayout`** — the button uses it for spinner state.
**Do NOT delete `beginApplyLayout` mutation** — it sets `isApplyingLayout: true`; still needed.

The FAILURE reducer branch for `applyLayout` currently sets `{isApplyingLayout: false, error: typed.payload}`. Change to `{isApplyingLayout: false, error: null}` (keep field, clear it). The obsolescence of `error` is a Phase 6 concern.

### 7.3 Tests

- Saga: success path asserts `put(notifySuccess({messageKey: "obsidian.applyLayoutSuccess", params: {folders, notes}}))` AND no `put({type: APPLY_LAYOUT_SUCCESS, payload: report})`; failure path asserts `put(notifyError(...))`.
- Component: mount Obsidian with a non-null `lastApplyLayoutReport` **field removed**; assert `toast.*` not called. (Because the field no longer exists, this is proved by the fact that the useEffect was deleted; the test just re-renders Obsidian twice to simulate remount and asserts `toast.success` mock was not called.)

### 7.4 Verify and commit

Same shape.

**Phase 3 exit criteria:** «Разложить по PARA» still shows its toast once; no re-fire on tab switch.

---

## 8. Phase 4 — migrate Obsidian bulkExport

Commit subject: `fix(obsidian): phase 4 — emit bulkExport result via notifications`

### 8.1 Scope

- Saga `bulkExportSaga.ts`.
- Component useEffect `Obsidian.tsx:63-67`.
- State field `lastBulkExportReport`.
- Selector `selectLastBulkExportReport`.

Translation key already exists: `obsidian.syncAllSuccess` with `{count}` param.

### 8.2 Changes

Mirror Phase 3 exactly — substitute the four proper names. Keep `isBulkExporting` flag; clear `error` on failure (Phase 6 removes the field).

### 8.3 Tests, verification, commit

As Phase 3.

**Phase 4 exit criteria:** sync-all toast one-shot; no re-fire.

---

## 9. Phase 5 — migrate Obsidian setupObsidian

Commit subject: `fix(obsidian): phase 5 — emit setup result via notifications`

### 9.1 Scope

- Saga `setupObsidianSaga.ts`.
- Component useEffect `Obsidian.tsx:80-86`.
- State field `lastSetupReport`.
- Selector `selectLastSetupReport`.

Translation key exists: `obsidian.setupSuccess` with `{created}` param.

### 9.2 Changes

Mirror Phase 3 exactly — substitute the four proper names. Keep `isSetupInProgress`; clear `error` on failure.

### 9.3 Tests, verification, commit

As Phase 3.

**Phase 5 exit criteria:** setup toast one-shot; no re-fire.

---

## 10. Phase 6 — remove obsidian.error field

Commit subject: `fix(obsidian): phase 6 — remove stale error field, all flows use notifications`

### 10.1 Scope

After Phases 3–5, `obsidian.error` is never read (the useEffect at `Obsidian.tsx:42-44` is the only reader, the only writers were the three failure branches — all now emit `notifyError` via saga and set `error: null`). Delete it.

### 10.2 Changes

- Remove `error: string | null` from `ObsidianState`.
- Remove all `error: null` writes and remaining `error: typed.payload` writes from `reducer.ts` (there should be none of the latter at this point).
- Delete the useEffect at `Obsidian.tsx:42-44`.
- Remove `error` from the destructured component props and the container `mapStateToProps`.
- Remove `selectObsidianError` if it exists.

### 10.3 Tests

- Obsidian component test: remount with simulated prior-failure state → zero `toast.*` calls.
- Type check only — no new behaviour, removal-only.

### 10.4 Verify and commit

As before.

**Phase 6 exit criteria:** no stale `error` field anywhere in obsidian slice.

---

## 11. Phase 7 — grep sweep + snapshot

Commit subject: `chore(notifications): phase 7 — grep sweep, lint sweep`

### 11.1 Grep contract

From `frontend/`, the following MUST all return zero hits:

```bash
grep -rn "lastApplyLayoutReport\|lastBulkExportReport\|lastSetupReport" src/
grep -rn "llmProbe\.ok\|selectLlmProbe\b" src/
grep -rn "settleLlmProbe\|CHECK_LLM_RESULT" src/
grep -n "useEffect" src/features/Settings/Settings.tsx src/features/Obsidian/Obsidian.tsx | grep -iE "(toast|error|lastApply|lastBulk|lastSetup|llmProbe)"
```

`grep -rn "toast\." src/store/` must return hits ONLY inside `src/store/slices/notifications/`.

If any of those return unexpected hits, a prior phase was incomplete — STOP, identify the phase, reopen, fix, re-commit (NOT amending an earlier phase commit; add a fix commit referencing the phase).

### 11.2 Full verification

```bash
cd frontend
npm run typecheck
npm run lint
npm test
```

All green.

### 11.3 Manual smoke (UNVERIFIED if cannot run Electron locally)

If able to run the app (`npm run dev` or equivalent — match whatever the project uses; do NOT invent commands):

1. Settings → Проверить соединение → toast. Switch to Queue. Switch back to Settings. No toast. Repeat for failure case.
2. Obsidian → Разложить по PARA → toast. Switch to Notes. Switch back to Obsidian. No toast.
3. Obsidian → sync-all → toast. Switch away, switch back. No toast.
4. Obsidian → setup → toast. Switch away, switch back. No toast.

If the sandbox cannot run the app, mark §11.3 UNVERIFIED in the report and confirm the fix is demonstrated by the RTL component tests instead.

### 11.4 Commit

Only if the grep sweep actually changed a line (e.g. imports cleanup). Otherwise skip this commit and declare the migration complete.

---

## 12. Commit schema

One commit per phase. Conventional Commits. Match `git log --oneline -30` style.

```
feat(notifications): phase 0 — scaffold slice-less notifications saga
fix(settings): phase 1 — emit LLM check toast via notifications
fix(settings): phase 2 — emit load/save errors via notifications
fix(obsidian): phase 3 — emit applyLayout result via notifications
fix(obsidian): phase 4 — emit bulkExport result via notifications
fix(obsidian): phase 5 — emit setup result via notifications
fix(obsidian): phase 6 — remove stale error field, all flows use notifications
chore(notifications): phase 7 — grep sweep, lint sweep
```

Each commit body: list files added / modified / deleted, and the test counts that passed on that phase. Keep it terse. Do NOT include emoji. Do NOT include `Co-Authored-By` unless the user asks.

---

## 13. Verification checklist (enforced at each phase boundary)

Before every commit:

- [ ] `npm run typecheck` green.
- [ ] `npm run lint` green.
- [ ] `npm test` green. New tests for this phase exist and cover success + every failure branch touched.
- [ ] The phase-specific `useEffect` is gone from the component, and the corresponding state field is gone from the slice (Phases 1, 3–6).
- [ ] No new `toast.*` import outside `src/store/slices/notifications/` (Phases 1+).
- [ ] No new `useEffect(…, [stateField])` that fires a toast introduced anywhere in migrated components.
- [ ] No push, no MR, no `main`/`master` touched.

If ANY box is unchecked: phase is not done. Do not commit.

---

## 14. Report

After each phase commit, append to `/home/coder/workspace/mozgoslav-stale-feedback-report-<short-id>.md`:

- Phase number + SHA.
- Files added / modified / deleted (full paths).
- Test counts (passed/failed/skipped).
- Any UNVERIFIED items with reasoning.

After Phase 7: end with a top-level summary: total commits, total LOC delta (added/removed), file count. Path to the report is the last thing you tell the user.

---

## 15. What you MUST NOT do

- NEVER push to remote. No `git push`.
- NEVER open an MR. No `glab`. No `gh`.
- NEVER touch `main` or `master`. You work exclusively on `rybalchenko/fix-stale-action-feedback-2026-04-22`.
- NEVER use `--force`, `--no-verify`, `-c commit.gpgsign=false`, or any hook-skip.
- NEVER collapse multiple phases into one commit. One phase = one commit. If you need to split a phase, add `phase N.a` / `phase N.b` — never merge.
- NEVER introduce a new `useEffect` that reads a state field and fires a toast. That is the exact anti-pattern being removed.
- NEVER import `react-toastify` outside `src/store/slices/notifications/saga/notificationsSaga.ts`. (The existing `ToastContainer` import in `main.tsx` is fine; do not move or rename it.)
- NEVER migrate a flow that is not in §1.1. This document is the full scope.
- NEVER expand to other slices («sync could use notifications too…»). Out of scope. If you spot a candidate, add a note to the report; do not fix.
- NEVER touch `.archive/`, `docs/adr/`, or `backend/`.
- NEVER ask the user clarifying questions mid-execution. Pick the best default, document as UNVERIFIED.
- NEVER delete the direct `toast.success(t("settings.savedToast"))` call in `Settings.tsx:64` — it is an event-handler toast and is correct as-is.

---

## 16. Tools & skills

You have full sandbox access. Recommended pattern per phase:

1. READ the saga, reducer, types, selectors, container, component — all of them — before writing.
2. `grep -rn` for each symbol you plan to delete, to confirm no unexpected consumer exists.
3. Write tests first (saga test: asserts the `put`; component test: asserts no toast on remount).
4. Apply the code change.
5. Run the verification checklist.
6. Commit.

No per-file build loops. Write the whole phase, then run `npm run typecheck && npm run lint && npm test` once. Rapid per-file cycles waste CPU in the sandbox (1-core cap per `CLAUDE.md`).

If this document conflicts with anything in `frontend/CLAUDE.md` or root `CLAUDE.md`: THIS document wins for the scope of this fix. Outside the fix, the `CLAUDE.md` files remain authoritative.

Ship it clean.
