import { contextBridge, ipcRenderer } from "electron";

export interface MozgoslavBridge {
  version: string;
  openAudioFiles: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openFolder: () => Promise<{ canceled: boolean; filePaths: string[] }>;
  openPath: (path: string) => Promise<string | undefined>;
}

export interface DictationOverlayState {
  phase: "idle" | "recording" | "processing" | "injecting" | "error";
  partialText: string;
  levels?: number[];
}

export interface MozgoslavOverlayBridge {
  onStateChange: (listener: (state: DictationOverlayState) => void) => () => void;
}

const bridge: MozgoslavBridge = {
  version: "0.1.0",
  openAudioFiles: () => ipcRenderer.invoke("dialog:openAudioFiles"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  openPath: (path) => ipcRenderer.invoke("shell:openPath", path),
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
