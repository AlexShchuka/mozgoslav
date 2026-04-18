import { BrowserWindow, globalShortcut } from "electron";

/**
 * Global dictation shortcut helper. Electron's `globalShortcut` API
 * only exists in the main process, so the renderer is notified via a broadcast
 * IPC event on every open `BrowserWindow`. The renderer Dashboard subscribes
 * through the preload bridge (`window.mozgoslav.onGlobalHotkey`) and kicks off
 * the same dictation lifecycle used by the mouse-5 entry point.
 *
 * The helper is split out from `main.ts` on purpose: `main.ts` uses
 * `import.meta.url` which ts-jest (CJS) cannot parse, so unit-testing it
 * directly is impossible today. This module only imports from `electron`,
 * which we mock in the test.
 */

/** Default cross-platform accelerator. Docs reference this constant. */
export const GLOBAL_HOTKEY_ACCELERATOR = "CommandOrControl+Shift+Space";

/** IPC channel name used to notify the renderer that the hotkey fired. */
export const GLOBAL_HOTKEY_IPC_CHANNEL = "mozgoslav:global-hotkey-toggle";

/** Payload that accompanies every IPC push for this hotkey. */
export interface GlobalHotkeyPayload {
  source: "global-hotkey";
}

const notifyRenderer = (payload: GlobalHotkeyPayload): void => {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send(GLOBAL_HOTKEY_IPC_CHANNEL, payload);
    } catch {
      // Swallow — a closing window can throw on send(); no user impact.
    }
  }
};

/**
 * Registers the global accelerator. Safe to call multiple times — Electron
 * silently ignores duplicate registrations for the same accelerator.
 *
 * Task #10 — `accelerator` defaults to the cross-platform `CommandOrControl+
 * Shift+Space` but callers can override from the persisted
 * `AppSettings.dictationKeyboardHotkey`. Empty / whitespace falls back to the
 * default so a blank field never breaks registration.
 *
 * Returns `true` if the registration succeeded.
 */
export const registerGlobalDictationHotkey = (
  accelerator: string = GLOBAL_HOTKEY_ACCELERATOR,
): boolean => {
  const effective = accelerator.trim() === "" ? GLOBAL_HOTKEY_ACCELERATOR : accelerator;
  return globalShortcut.register(effective, () => {
    notifyRenderer({ source: "global-hotkey" });
  });
};

/**
 * Must be called on `app.on("will-quit", …)` per Electron's documentation so
 * the accelerator is released. Calling this more than once is a noop.
 */
export const unregisterGlobalDictationHotkey = (): void => {
  globalShortcut.unregisterAll();
};
