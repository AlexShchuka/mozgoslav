import { ipcRenderer } from "electron";

export interface HotkeyEvent {
    type: "press" | "release";
    source: "keyboard" | "mouse";
}

class HotkeyMonitor {
    private listeners: Set<(event: HotkeyEvent) => void> = new Set();
    private isMonitoring = false;

    constructor() {
        ipcRenderer.on("global-hotkey", (_event, payload: HotkeyEvent) => {
            this.listeners.forEach(listener => listener(payload));
        });
    }

    start(): void {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        nativeHelperClient.registerGlobalHotkey("dictation-hotkey", "Control+D");
    }

    stop(): void {
        if (!this.isMonitoring) return;
        this.isMonitoring = false;
        nativeHelperClient.unregisterGlobalHotkey("dictation-hotkey");
    }

    on(listener: (event: HotkeyEvent) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
}

export const hotkeyMonitor = new HotkeyMonitor();
