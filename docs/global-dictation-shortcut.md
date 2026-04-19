# Global dictation shortcut (macOS-primary)

**Accelerator:** `Cmd+Shift+Space` on macOS / `Ctrl+Shift+Space` on Linux/Windows
**Wiring:** Electron `globalShortcut` → main IPC broadcast → renderer Dashboard

## What it does

Pressing the accelerator from **anywhere on macOS** — even while a different
app has focus — kicks off a dictation session and is equivalent to clicking
Dashboard → Record. A second press stops the current session. The `source`
field sent to `POST /api/dictation/start` is `"global-hotkey"` so the backend
can attach the correct profile or open the overlay in a "global" mode.

This is a **parallel entry point** to the press-to-talk mouse-5 pipeline
(ADR-002). Both share the same `DictationOrchestrator` on the main process.

## macOS prerequisites

For the accelerator to fire in the background, the user must grant two
permissions in System Settings → Privacy & Security:

1. **Input Monitoring** — otherwise `globalShortcut.register` returns `false`
   on Apple Silicon when the app isn't in focus.
2. **Accessibility** — only needed if the session ends with text injection
   via AX API (this is the default — see ADR-002 D5).

Both permissions are surfaced in the onboarding wizard (steps Mic,
Accessibility, Input Monitoring). If the accelerator stops responding after
an Electron rebuild:

1. Remove Mozgoslav from both permission lists.
2. Quit Mozgoslav fully (`Cmd+Q`, not just the window).
3. Re-open — macOS re-prompts on first accelerator press.

## Rebinding

The accelerator is currently hard-coded to `CommandOrControl+Shift+Space`.
Per-user rebinding via Settings is tracked as a **future** item — the
backend schema already has `dictationKeyboardHotkey` which can be repurposed
in a follow-up iteration.

## Testing on the user's Mac

Only the helper module can be unit-tested under jest (ts-jest CJS can't parse
`import.meta.url` in `main.ts`). The round-trip below verifies the accelerator
actually broadcasts the IPC event end-to-end:

1. `npm --prefix frontend run dev` — Electron boots with dev tools open.
2. Focus any other app (VSCode, Slack, Finder — anything but Mozgoslav).
3. Press `Cmd+Shift+Space`. You should see:
    - The overlay window appear with phase=`recording`.
    - Dashboard (if open) shows `data-testid="dashboard-record"` flip to
      the "Stop" label.
4. Speak; press `Cmd+Shift+Space` again. Overlay disappears; the transcript
   is visible under the Dashboard card once the backend responds.

If step 3 doesn't fire, inspect the dev-tools console for the main process
(`View → Toggle Developer Tools → the ☰ menu in the top right → Open
DevTools for Main`). A failed `globalShortcut.register` call logs a warning
line tagged `[globalShortcut]`.

## Source files

| File                                                 | Purpose                                                                                       |
|------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| `frontend/electron/dictation/globalHotkey.ts`        | Accelerator register/unregister + broadcast                                                   |
| `frontend/electron/main.ts`                          | Calls `registerGlobalDictationHotkey()` on ready, `unregisterGlobalDictationHotkey()` on quit |
| `frontend/electron/preload.ts`                       | `window.mozgoslav.onGlobalHotkey(cb)` bridge                                                  |
| `frontend/src/features/Dashboard/Dashboard.tsx`      | Renderer subscription → `api.startDictation({ source: "global-hotkey" })`                     |
| `frontend/__tests__/electron/globalShortcut.test.ts` | Unit tests (mocked electron)                                                                  |
