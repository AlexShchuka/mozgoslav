import { BrowserWindow, globalShortcut } from "electron";

export const GLOBAL_HOTKEY_ACCELERATOR = "CommandOrControl+Shift+Space";

export const GLOBAL_HOTKEY_IPC_CHANNEL = "mozgoslav:global-hotkey-toggle";

export interface GlobalHotkeyPayload {
  source: "global-hotkey";
}

const notifyRenderer = (payload: GlobalHotkeyPayload): void => {
  const windows = BrowserWindow.getAllWindows();
  const alive = windows.filter((w) => !w.isDestroyed());
  console.info(
    `[hotkey] notifyRenderer: broadcasting to ${alive.length}/${windows.length} window(s)`
  );
  for (const win of alive) {
    try {
      win.webContents.send(GLOBAL_HOTKEY_IPC_CHANNEL, payload);
    } catch (err) {
      console.warn("[hotkey] notifyRenderer: webContents.send threw:", err);
    }
  }
};

export const registerGlobalDictationHotkey = (
  accelerator: string = GLOBAL_HOTKEY_ACCELERATOR
): boolean => {
  const effective = accelerator.trim() === "" ? GLOBAL_HOTKEY_ACCELERATOR : accelerator;
  console.info(`[hotkey] register: requesting accelerator='${effective}'`);
  const ok = globalShortcut.register(effective, () => {
    console.info(`[hotkey] FIRED: accelerator='${effective}' at ${new Date().toISOString()}`);
    notifyRenderer({ source: "global-hotkey" });
  });
  const verified = globalShortcut.isRegistered(effective);
  console.info(
    `[hotkey] register: result=${ok} isRegistered=${verified} accelerator='${effective}'`
  );
  return ok;
};

export const unregisterGlobalDictationHotkey = (): void => {
  globalShortcut.unregisterAll();
};
