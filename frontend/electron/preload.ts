import {contextBridge, ipcRenderer} from "electron";

export interface GlobalHotkeyPayload {
    source: "global-hotkey";
}

export interface MozgoslavBridge {
    version: string;
    openAudioFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    openFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    openPath: (path: string) => Promise<string | undefined>;
    openExternal: (url: string) => Promise<boolean>;
    isAccessibilityTrusted: () => Promise<boolean>;
    requestAccessibility: () => Promise<boolean>;
    openModelFile: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    openModelFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
    listSyncConflicts: (
        folderPath: string,
    ) => Promise<Array<{ folderId: string; path: string; conflictPath: string }>>;
    onGlobalHotkey: (
        listener: (payload: GlobalHotkeyPayload) => void,
    ) => () => void;
    startNativeRecording?: (outputPath: string) => Promise<{ sessionId: string }>;
    stopNativeRecording?: (sessionId: string) => Promise<{ path: string; durationMs: number }>;
    dictationInject?: (
        text: string,
        mode: "auto" | "cgevent" | "accessibility",
    ) => Promise<void>;
}

export interface DictationOverlayState {
    phase: "idle" | "recording" | "processing" | "injecting" | "error";
    partialText: string;
    levels?: number[];
}

export interface MozgoslavOverlayBridge {
    onStateChange: (listener: (state: DictationOverlayState) => void) => () => void;
}

const GLOBAL_HOTKEY_CHANNEL = "mozgoslav:global-hotkey-toggle";

const bridge: MozgoslavBridge = {
    version: "0.1.0",
    openAudioFiles: () => ipcRenderer.invoke("dialog:openAudioFiles"),
    openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
    openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
    openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
    isAccessibilityTrusted: () => ipcRenderer.invoke("permissions:isAccessibilityTrusted"),
    requestAccessibility: () => ipcRenderer.invoke("permissions:requestAccessibility"),
    openModelFile: () => ipcRenderer.invoke("dialog:openModelFile"),
    openModelFolder: () => ipcRenderer.invoke("dialog:openModelFolder"),
    listSyncConflicts: (folderPath) =>
        ipcRenderer.invoke("sync:listConflicts", folderPath),
    onGlobalHotkey: (listener) => {
        const handler = (_event: Electron.IpcRendererEvent, payload: GlobalHotkeyPayload) =>
            listener(payload);
        ipcRenderer.on(GLOBAL_HOTKEY_CHANNEL, handler);
        return () => {
            ipcRenderer.removeListener(GLOBAL_HOTKEY_CHANNEL, handler);
        };
    },
    startNativeRecording: (outputPath) =>
        ipcRenderer.invoke("record:start", outputPath),
    stopNativeRecording: (sessionId) =>
        ipcRenderer.invoke("record:stop", sessionId),
    dictationInject: (text, mode) =>
        ipcRenderer.invoke("dictation:inject", text, mode),
};

const overlayBridge: MozgoslavOverlayBridge = {
    onStateChange: (listener) => {
        const handler = (_event: Electron.IpcRendererEvent, state: DictationOverlayState) =>
            listener(state);
        ipcRenderer.on("dictation:overlay-state", handler);
        return () => {
            ipcRenderer.removeListener("dictation:overlay-state", handler);
        };
    },
};

contextBridge.exposeInMainWorld("mozgoslav", bridge);
contextBridge.exposeInMainWorld("mozgoslavOverlay", overlayBridge);
