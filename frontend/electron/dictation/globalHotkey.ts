import { ipcRenderer } from "electron";

const HOTKEY_ID = "dictation-hotkey";
const HOTKEY_KEY = "Control+D";

export async function registerGlobalHotkey(): Promise<void> {
    await nativeHelperClient.registerGlobalHotkey(HOTKEY_ID, HOTKEY_KEY);
}

export async function unregisterGlobalHotkey(): Promise<void> {
    await nativeHelperClient.unregisterGlobalHotkey(HOTKEY_ID);
}
